const express = require('express');
const multer  = require('multer');
const upload = multer({ dest: 'Task files/' });
const fs = require('fs');
const { path } = require('express/lib/application');
const app = express();
const port = 80;


app.use('/', express.static('css'));
app.use('/', express.static('js'));
app.use('/', express.static('svg'));


let statuses;

function loadStatuses()
{
  statuses = JSON.parse(fs.readFileSync('taskStatuses.json'));
}

loadStatuses();


app.get('/', (req, res) => {
  res.sendFile('./html/index.html', { root: __dirname });
});


app.get('/statuses', (req, res) => {
  res.send(statuses);
})


app.get('/tasks', (req, res) => {
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


app.get('/tasks/:id/file', (req, res) => {
  const rawTasks = fs.readFileSync('tasks.json');
  const tasks = JSON.parse(rawTasks);
  
  const taskId = Number(req.params.id);

  const task = tasks.find(t => t.id === taskId);

  res.download(`${__dirname}/Task files/${taskId}.bin`, task.file);
})


app.put('/tasks/:id/update', upload.single('file'), (req, res) => {
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


app.post('/tasks/add', upload.single('file'), (req, res) => {
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


app.delete('/tasks/:id/delete', (req, res) => {
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