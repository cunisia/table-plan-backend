const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const router = require('./router.js');

const app = express();

app.use(cors()); //TODO: /!\ for tests purposes only requests from any origin are accepted, to change later
app.use(bodyParser.json());
app.use(router);

app.listen(8080);
