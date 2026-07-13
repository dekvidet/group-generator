# Group Generator

Group Generator imports participants from CSV, assigns them to groups for one or more rounds, displays assignment statistics, and exports the result to XLSX or CSV.

## Goals

- Groups must never exceed the configured maximum size. When the participant count does not divide evenly, group sizes should be as equal as possible; for example, `5, 5, 4, 4, 4` is preferred over `5, 5, 5, 5, 2`.
- Leaders must stay in the same numbered group in every round. If compulsory leaders are enabled, missing leaders should be selected in the order voluntary, indifferent, and explicitly unwilling.
- The generator must produce the configured number of rounds.
- When gender balancing is enabled, every group should be as close as possible to the overall classified gender ratio. Gender balance has priority over age preferences.
- When preferred-age assignment is enabled, the generator should optimize satisfaction for every participant, including how a placement affects existing group members.
- When sibling separation is enabled, participants with the same mapped family name must be in different groups.

## Implementation status

| Goal | Status |
| --- | --- |
| Maximum and evenly distributed group sizes | Enforced as exact per-group capacities. |
| Fixed leaders and co-leaders | Leaders are assigned once and copied to the same groups in every round. |
| Leader promotion order | Voluntary leaders are used first, then indifferent participants, then participants whose mapped value means unwilling. |
| Requested rounds | Enforced after numeric validation. |
| Gender before age | Enforced by lexicographic solution comparison. |
| Pairwise age satisfaction | Optimized for both the candidate and existing group members. |
| Sibling separation | Enforced when a family-name column is mapped and the option is enabled. |
| Avoid repeated groupmates | Optimized across the complete multi-round schedule when the Unique policy is selected. |

The optimizer is a bounded multi-start local search, not an exact mathematical solver. Hard constraints are enforced, but the best soft-score result found within the search budget is not guaranteed to be the global optimum.

## Participant data

- The first CSV row is the header and empty rows are skipped.
- CSV columns can be mapped to `id`, `gender`, `age`, preferred `targetAge`, `isGroupLeader`, and `familyName`. All original columns are retained for display and export.
- Empty IDs are replaced with `N/A #1`, `N/A #2`, and so on. After the first row with an ID, later duplicate-ID rows are removed.
- Selected voluntary-leader values create voluntary leaders. Selected unwilling-leader values are only used after indifferent participants if compulsory promotion is required. Other values are indifferent.
- Only explicitly selected male and female values participate in gender balancing. Other gender values remain unclassified.
- Preferred-age values can be mapped to named inclusive age ranges. Ages and range endpoints are parsed as integers.

## Saved settings

Column mappings, mapped gender/leader values, preferred-age ranges, group-generation settings, and the columns selected for display are saved in browser local storage. Uploaded files, participant rows, and generated groups are not saved.

When a CSV is uploaded, the saved configuration is retained only if every referenced mapped column and every selected display column exists in the new header. Column names are matched exactly. If any referenced column is missing, both mapping and generation settings start from their defaults and the incompatible saved configuration is replaced.

The three clearing actions have separate scopes:

- **Remove** in the upload section removes the current file and file-derived results but preserves saved settings. Uploading another CSV with the same columns therefore restores the existing configuration.
- **Reset mapping** clears column mappings, mapped values, age ranges, processed participants, and generated results while keeping the uploaded file and generation settings.
- **Reset settings** clears group-generation settings, selected display columns, and generated results while keeping the uploaded file and column mappings.

## Group generation

### Validation and exact sizes

Group size must be a positive integer. Rounds and minimum leaders must be non-negative integers. Enabled gender balancing requires at least one classified participant, and enabled age optimization requires a valid integer age for every participant and valid endpoints for every used configured range.

For `N` participants and maximum size `S`, the number of groups is:

```text
G = ceil(N / S)
```

The optimizer assigns `N mod G` groups size `ceil(N / G)` and all remaining groups size `floor(N / G)`. These are exact capacities for every round, so the difference between the largest and smallest group is at most one.

### Leaders

All voluntary leaders are retained. If compulsory leaders are enabled, the required total is `G * minimum leaders per group`. Missing leaders are promoted from indifferent participants first and unwilling participants only if necessary. Selection within the same willingness class uses the configured seed.

The optimizer assigns leaders once while respecting group capacities, the minimum when enabled, and sibling separation. This leader-to-group mapping is then fixed across every round. If the requirements cannot be satisfied, generation stops and shows an error.

When compulsory leaders are disabled, the configured minimum is not enforced; existing voluntary leaders still remain fixed.

### Multi-start optimization

The browser generates several complete candidate schedules using a deterministic pseudo-random generator. Participants from the most common families are placed first when sibling separation is active. Every possible placement is compared in this priority order:

1. gender-allocation change, when enabled;
2. pairwise age dissatisfaction added for the candidate and existing members, when enabled;
3. prior meetings added, when the Unique policy is selected; and
4. remaining group capacity.

Each feasible candidate schedule is then improved by swapping non-leaders between groups. A swap is retained only when it preserves all hard constraints and improves the complete schedule lexicographically:

1. worst-group gender error;
2. total gender error;
3. worst-participant age dissatisfaction;
4. total age dissatisfaction;
5. worst repeated-pair frequency; and
6. convex repeated-pair cost.

This ordering gives gender balance priority over age satisfaction, and fairness terms priority over averages. The optimizer compares multiple starts and keeps the best complete schedule. The seed makes the result reproducible; changing it explores different candidate schedules.

The Random assignment policy still optimizes enabled gender and age goals, but it removes repeat avoidance from construction and solution comparison.

## Metrics

All scores range from `0` to `1`, where higher is better, unless described as a count or cost.

Score text uses five soft color bands: dark green for `0.90–1.00`, light green for `0.75–0.89`, yellow for `0.60–0.74`, orange for `0.40–0.59`, and red below `0.40`. Group rows in the statistics table are clickable and keyboard-accessible; activating one scrolls to that round's group-member table. Raw count/cost metrics are not colored with this scale because lower and upper bounds differ by data set.

### Gender allocation score

For classified participants in a group, the displayed score is:

```text
1 - abs(group male proportion - overall male proportion)
```

The optimizer minimizes the worst group before total error, preventing a good average from hiding one badly imbalanced group. Unclassified values do not affect the male/female proportions. A group with no classified participants is neutral and scores `1`.

This score is appropriate for the current two-category mapping. Supporting more gender categories should use a distribution distance such as total variation distance instead.

### Age satisfaction score

Age satisfaction is directional because one participant's preference may differ from another's. For participant `p`, groupmate age `a`, and preferred interval `[low, high]`:

```text
distance(p, a) = 0          when low <= a <= high
                 low - a    when a < low
                 a - high   when a > high

satisfaction(p, a) = 1 / (1 + distance(p, a))
```

A participant's score is the average satisfaction over every groupmate, not merely whether one suitable groupmate exists. The group score averages participants who have a configured preference; participants without one are excluded. A singleton with a preference scores `0` because no preference is fulfilled.

The optimizer minimizes the worst participant's dissatisfaction before total dissatisfaction. Near misses therefore score better than distant misses, and one poorly served participant cannot be hidden as easily by a high average.

The `1 / (1 + distance)` curve makes a one-year miss worth `0.5`; changing this curve is a product-policy decision if that penalty is too steep.

### New-contact score

For a group in the current round:

```text
new-contact score = 1 / (1 + average previous meetings per current pair)
```

The first meeting scores `1`; repeated meetings progressively reduce the score. A singleton scores `0` because it creates no contact.

For the complete schedule, the results also report:

- **unique-pair coverage:** distinct observed pairs divided by all possible participant pairs;
- **convex repeat cost:** `sum(meetings(pair) choose 2)`, which penalizes repeatedly repeating the same pair;
- **worst pair frequency:** the greatest number of shared rounds for any pair; and
- **distinct contacts:** average and minimum distinct groupmates met per participant.

Fixed co-leaders necessarily contribute repeated pairs. Their repetition remains visible because it is a real property of the generated schedule, though it may be unavoidable.

### No combined total score

The old equal-weight total score has been removed. It contradicted the required gender-over-age priority, mixed unrelated measurements, and could conceal a hard-constraint failure. Feasibility is evaluated first; the optimizer then uses the explicit lexicographic objective described above. Individual metrics remain visible for diagnosis.

## Constraints and edge cases

- A family cannot be separated if it has more members than there are groups. Other combinations of fixed leaders, capacities, and family constraints can also be infeasible; these produce an error.
- Participants whose preferred-age value has no configured range are excluded from age satisfaction rather than assigned an invented preference.
- Local search can escape many poor construction choices through swaps but cannot prove optimality. An exact constraint-programming or mixed-integer solver would be the next step if optimality proofs are required.
- Optimization runs synchronously in the browser. The search budget is reduced for participant lists above 200 to keep generation responsive.
- Initial defaults are group size `5`, minimum leaders `0`, `3` rounds, Unique assignment, seed `1`, gender and age optimization enabled, compulsory leaders enabled, and sibling separation disabled.

## Export

XLSX, CSV, and PDF exports contain one row per participant, the selected original columns, an `X` for generated leaders, and the participant's group number in each round. PDF embeds a Unicode font for Hungarian text, sorts rows by mapped family name and then the other displayed name, and uses a blue header with alternating light rows. Its landscape table automatically splits wide or long results across pages.

## License

Licensed under [GPLv3](LICENSE.txt).

## Commit message guide

Keep commit messages short, specific, and focused on one change.

- Use one imperative summary line, ideally under 72 characters.
- Mention the user-facing outcome first.
- Group related implementation details in the body when needed.
- Avoid vague wording like `misc changes` or `updates`.

Examples:

- `Add local storage for generator settings`
- `Export groups as PDF with Unicode support`
- `Improve group scoring and statistics display`
