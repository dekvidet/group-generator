let e;onconnect=o=>{e=o.ports[0],e.onmessage=s=>{e.postMessage(s.data)}};
