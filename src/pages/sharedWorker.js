let port;

onconnect = (e) => {
  port = e.ports[0];
  port.onmessage = (event) => {
    // Re-post the message to all connected ports (in this case, just the DisplayPage)
    port.postMessage(event.data);
  };
};