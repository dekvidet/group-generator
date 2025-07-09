Create a React Vite app using Typescript, material UI, and React's built in state management that has a page with a drag and drop field where users can upload CSV files. The CSV file will be in similiar format as the one inside input/input.csv. After it got read, create a    │
│    list of the unique values for all the columns that will be used to map values later. Now, show a UI where the user can select the columns marked by the headers for the following values: id, gender, first name, last name, age, e-mail, target age, is group leader. For the      │
│    "gender" field, show a subfield where the user selects the values for "male" and "female" from the unique values from the CSV. For the "target age" show a subfield where age ranges can be created then mapped from the unique values from the selected field from the CSV. For    │
│    the "is group leader" show a subfield where the user can select which values should mean a true value for this column. Have a "process" button which gets clicked and executes the  mapping of the CSV data using camelCase property names to a JS object then show 2 statistic     │
│    tables: On the left "participant ratios" with rows: "men", "women" and columns: "all participants", "team leaders" with sum rows for each column. On the right: "age groups" with rows: "men", "women" and a column for each target age created in the previous step with the count │
│      statistic for both men and women with sum rows for each column. Below this, show a  UI where the user can provide the following data for the next step: Size of groups (integer), minimum number of group leaders in a group (integer), number of rounds (integer), shuffle       │
│    policy (dropdown with options: "unique", "random"), ballance genders (checkbox), split by target age (checkbox). Show a "Generate groups" button which starts the process of generation: Organize the candidates into groups of the size provided by the "size of groups". If       │
│    "split by target age" is checked then participants should be placed into the groups where the group's average age is closest to the specified range. if "balance gender" is checked then the gender ratio of the groups should resemble the ratio of the gender ratio of the entire │
│     pool of participants. Divide group leaders up based on the minimum requirement provided in "minimum number of group leaders in a group", don't place more group leaders into a group until all other groups have the required amount of leader. This takes precedence over target  │
│    age and gener ratio. Do this process as many times as described in the "number of rounds" field. If "shuffle policy" is "unique" then you should track for all players which other players they have shared a group with and try to organize them into a groups for the next round  │
│    in a way that maximizes this list for each player so each player will be able to be in a group with as much other players as possible throughout the rounds. The shuffle policy doesn't apply to group leaders. They will stay in the group they were generated into in the first   │
│    round. Each group should have a unique incremented integer id that gets reused in each round with the group leaders staying in the group with the same id. When this generation is done, show the results in such a way: create a header for each round, If "split by target age"   │
│    is selected create a subheader for each target age, show each group as a table with the rows beaing the participants and the columns being all of their respecitve data, the group leaders should be on top in bold font. Show a button "download XLS" where the same results will  │
│    be organized into an .xls spreadsheet where the first column is the id, 2nd column is the full name, the following columns are the group's id which they belong to in each round. The final column is an "X" if the player is a group leader.                                       │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

✦ I will create a React Vite app with TypeScript, Material-UI for the UI components, and Zustand for state management. The app will allow users to upload a CSV file, map its columns to specific fields, and then generate balanced teams based on various criteria.

  Here's a more detailed plan:


   1. Setup the Project: I'll start by scaffolding a new React Vite project with TypeScript and installing the necessary dependencies: Material-UI, Zustand, and a library for parsing CSV files.


   2. CSV Upload and Mapping:
       * I'll create a drag-and-drop component for uploading CSV files.
       * Once a file is uploaded, I'll parse it and extract the headers and unique values from each column.
       * I'll then display a UI that allows the user to map the CSV columns to the required fields: id, gender, firstName, lastName, age, email, targetAge, and isGroupLeader.
       * For the gender, targetAge, and isGroupLeader fields, I'll provide sub-fields to map the specific values from the CSV to the application's internal representation (e.g., "male" -> true, "female" -> false).


   3. Data Processing and Statistics:
       * After the mapping is complete, I'll process the CSV data into an array of JavaScript objects with camelCase property names.
       * I'll then calculate and display two statistics tables:
           * Participant Ratios: Showing the number of men and women who are participants and team leaders.
           * Age Groups: Showing the distribution of men and women across the defined target age groups.


   4. Group Generation:
       * I'll create a form where the user can specify the group generation parameters: group size, minimum number of leaders per group, number of rounds, shuffle policy, and options to balance genders and split by target age.
       * The core of the application will be the group generation logic, which will take the processed data and the generation parameters as input and produce a set of balanced groups for each round. This will involve careful consideration of the constraints, such as the minimum
         number of leaders per group and the gender balance.


   5. Display and Export Results:
       * The generated groups will be displayed in a clear and organized manner, with each round and target age group presented separately.
       * Finally, I'll add a button to download the results as an XLS file, with the specified format.

