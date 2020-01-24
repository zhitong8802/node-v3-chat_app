const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUserInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log('New WebSocket Connection.')

    socket.on('join', ({ username, room }, callback) => {
        room = room.trim().toLowerCase()
        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(room)

        socket.emit('message', generateMessage(username, 'Welcome!'))
        socket.broadcast.to(room).emit('message', generateMessage(username, `${username} has joined!`))
        io.to(room).emit('roomData', {
            room: room,
            users: getUserInRoom(room)
        })


        callback()
    })

    socket.on('sendMessage', (senderMsg, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(senderMsg)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, senderMsg))

        callback()

    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.emit('message', generateMessage(user.username, `${user.username} has left.`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUserInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})