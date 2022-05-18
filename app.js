import { Sequelize, Model, DataTypes } from 'sequelize';

const sequelize = new Sequelize('postgres://taxi_bot_user:789456123@localhost:5432/taxi_bot')

const User = sequelize.define('config', {
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

// const jane = User.create({
//   username: 'janedoe',
//   birthday: new Date(1980, 6, 20),
// });
async function  init () {
  try {
    const users = await User.findAll();
    console.log('Connection has been established successfully.', users);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } 
}

init()