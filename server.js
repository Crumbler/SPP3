const express = require('express');
const multer  = require('multer');
const upload = multer({ dest: 'Task files/' });
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { path, use } = require('express/lib/application');
const jwt = require('jsonwebtoken');
const app = express();

const port = 80;
const jwtKey = 'mysecretkey';
const jwtExpirySeconds = 300;
const uName = 'Bob';
const uPass = 'dale123';


app.use('/', express.static('html'));
app.use('/', express.static('css'));
app.use('/', express.static('js'));
app.use('/', express.static('svg'));


let statuses;

function loadStatuses() {
  statuses = JSON.parse(fs.readFileSync('taskStatuses.json'));
}

loadStatuses();


app.use(cookieParser());


app.post('/login', upload.none(), (req, res) => {
  const { username, password } = req.body;

  if (username !== uName || password !== uPass) {
    console.log('Failed to log in');
    res.status(401).end();
  }

  res.cookie('token', '5', {
    httpOnly: true,
    maxAge: jwtExpirySeconds * 1000
  });

  console.log('Successful login');

  res.status(200).end();
});


function checkAuth(req, res, next) {
  if (req.cookies.token !== '5') {
    return res.status(401).end();
  }

  next();
}


app.get('/statuses', checkAuth, (req, res) => {
  res.send(statuses);
})


app.get('/tasks', checkAuth, (req, res) => {
  const rawTasks = fs.readFileSync('tasks.json');
  let tasks = JSON.parse(rawTasks);

  let filter = req.query.filter;

  if (filter)
  {
    filter = Number(filter);
    tasks = tasks.filter(task => task.statusId === filter);
  }

  res.send(tasks);
})


app.get('/tasks/:id/file', checkAuth, (req, res) => {
  const rawTasks = fs.readFileSync('tasks.json');
  const tasks = JSON.parse(rawTasks);
  
  const taskId = Number(req.params.id);

  const task = tasks.find(t => t.id === taskId);

  res.download(`${__dirname}/Task files/${taskId}.bin`, task.file);
})


app.put('/tasks/:id/update', checkAuth, upload.single('file'), (req, res) => {
  if (!req.body) {
    return res.sendStatus(400);
  }

  const rawTasks = fs.readFileSync('tasks.json');
  const tasks = JSON.parse(rawTasks);
  
  const taskId = Number(req.params.id);
  
  const task = tasks.find(t => t.id === taskId);

  if (req.body.name != null) {
    task.title = req.body.name;
  }

  if (req.body.statusid != null) {
    task.statusId = Number(req.body.statusid);
  }

  if (req.body.date) {
    task.completionDate = req.body.date;
  }
  else {
    task.completionDate = null;
  }

  if (req.file) {
    fs.renameSync(`Task files/${req.file.filename}`, `Task files/${taskId}.bin`);
    task.file = req.file.originalname;
  }
  else {
    try {
      fs.unlinkSync(`Task files/${taskId}.bin`);
    } catch(err) {
      // file didn't exist
    }

    task.file = null;
  }

  const writeData = JSON.stringify(tasks, null, 2);
  fs.writeFileSync('tasks.json', writeData);

  res.sendStatus(200);
})


app.post('/tasks/add', checkAuth, upload.single('file'), (req, res) => {
  if (!req.body) {
    return res.sendStatus(400);
  }

  const rawTasks = fs.readFileSync('tasks.json');
  const tasks = JSON.parse(rawTasks);
  
  const taskId = tasks[tasks.length - 1].id + 1;
  
  const task = { 
    id: taskId,
    title: req.body.name ?? 'New task',
    statusId: Number(req.body.statusid ?? '0'),
    completionDate: req.body.date
  };

  if (!req.body.date) {
    task.completionDate = null;
  }

  if (req.file) {
    fs.renameSync('Task files/' + req.file.filename, 'Task files/' + taskId + '.bin');
    task.file = req.file.originalname;
  }
  else {
    try {
      fs.unlinkSync('Task files/' + taskId + '.bin');
    } catch(err) {
      // file didn't exist
    }

    task.file = null;
  }

  tasks.push(task);

  const writeData = JSON.stringify(tasks, null, 2);
  fs.writeFileSync('tasks.json', writeData);

  res.status(200).send(String(taskId));
})


app.delete('/tasks/:id/delete', checkAuth, (req, res) => {
  const rawTasks = fs.readFileSync('tasks.json');
  let tasks = JSON.parse(rawTasks);

  const taskId = Number(req.params.id);

  const taskInd = tasks.findIndex(task => task.id === taskId);
  
  tasks.splice(taskInd, 1);
  tasks = tasks.filter(e => e != null);

  try {
    fs.unlinkSync(`Task files/${taskId}.bin`);
  } catch(err) {
    // file didn't exist
  }

  const writeData = JSON.stringify(tasks, null, 2);
  fs.writeFileSync('tasks.json', writeData);

  res.sendStatus(200);
})


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});