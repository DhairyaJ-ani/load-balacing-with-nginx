const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const replicaApp = process.env.APP_NAME;

app.use('/pictures',express.static(path.join(__dirname,'pictures')));

app.use('/',(req, res)=> {
    res.sendFile(path.join(__dirname,'index.html'));
    console.log(`Request servered by the ${replicaApp}`);
});

app.listen(port, () => {
    console.log(`App is listening on the port: ${port}`)
});

