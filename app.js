import { Sequelize, Model, DataTypes, where } from 'sequelize'
import express from 'express'
import { engine } from 'express-handlebars'
import { readFile } from 'fs.promises'

const { DB_USER = 'taxi_bot_user', DB_PASSWORD = '789456123', DB_HOST = 'localhost', DB_PORT = '5432', DB_NAME = 'taxi_bot' } = process.env
const sequelize = new Sequelize(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`)


const app = express()
app.use(express.urlencoded({ extended: true }))

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.static(`${__dirname}/assets`));

const types = {
  host: function(value) {
    var arr = value.split(".")
    if (arr.length != 4){
      return false
    }
    for(var item in arr){
      if(isNaN(arr[item])){
        return false
      }
      if (255 < arr[item] || arr[item] < 0){
        return false
      }
    }
    return true
  },
  port: function(value) {
    if (isNaN(value)){
      return false
    }
    if (65535 < value || value < 1024){
      return false
    }
    return true
  },
  url: function validURL(value) {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(value);
  }
}

async function loadMapping () {
  try{
    var render = JSON.parse(await readFile("mapping.json", "utf8"));
    return render
  }
  catch(e){
    console.error(e)
  }
  return null
}

const Config = sequelize.define('config', {
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
    primaryKey: true
  },
  data: DataTypes.TEXT,
},
{
  tableName: 'config',
  timestamps: false
}
);

const Log = sequelize.define('log', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    primaryKey: true
  },
  text: DataTypes.TEXT,
  time: DataTypes.TEXT
},
{
  tableName: 'log',
  timestamps: false
}
);

app.get('/', async function (_, response) {
  const config = await Config.findAll();
  const data = config.map(({dataValues}) => dataValues)
  console.log(data)

  response.render('home', { data } )
})

app.get('/users', async function (_, response) {
  const users = await Log.findAll();
  const usernames = users.map(({dataValues}) => {
    const payload = JSON.parse(dataValues.text)
    return payload.username
  })
  const tablenames = {}
  for (var user in usernames){
    var name = usernames[user]
    if (name in tablenames){
      tablenames[name] += 1
    }
    else{
      tablenames[name] = 1
    }
  }
  console.log(tablenames)
  response.render('users', {tablenames})
})

app.get('/log', async function (request, response) {
  var page = parseInt(request.query.page)
  var nextpage = page + 1
  var prevpage = page - 1
  const log = await Log.findAll({
      limit: 100,
      offset: (page - 1) * 100
    });
  const data = log.map(({dataValues}) => {
    const payload = JSON.parse(dataValues.text)
    return {
      id: dataValues.id,
      username: payload.username,
      name: payload.name,
      text: payload.text,
      time: dataValues.time
    }
  })
  console.log(data)
  if (data.length < 100){
    nextpage = null
  }
  response.render('log', { data, page, nextpage, prevpage})
})

app.post('/save', async function (request, response){
  const newData = request.body
  console.log(newData)  
  
const mapping = await loadMapping()

  try{
    for (const key in newData){
      var flag = true
      if (key in mapping){
        const validate = types[mapping[key].type]
        flag = validate(newData[key])
      }
      if (flag){
        await Config.update({data: newData[key]}, {
          where: {
            name: key
          }
        })
      }
      else{
        response.send("Значение в поле " + key + " некорректное")
        return 
      }
      }

    response.send("Data updated")
  }
  catch(e){
    console.error(e)
    response.send(e)
  }
})

const port = process.env.PORT || 4000
app.listen(port,()=> console.log(`App started on port=${port}`))