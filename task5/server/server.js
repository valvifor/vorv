const uuidLib = require("uuid")
const mongoose = require("mongoose")
const Document = require("./Document")

mongoose.connect("mongodb://127.0.0.1:27017/google-docs")

const io = require('socket.io')(3001, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
})

io.on("connection", socket => {
    socket.on("get-document", async documentId => {
        const document = await findDocument(documentId)
        socket.join(documentId)
        socket.emit("load-document", document)
        if (document == null) {
            socket.disconnect();
        }
        else {
            socket.on("send-changes", delta => {
                socket.broadcast.to(documentId).emit("receive-changes", delta)
            })

            socket.on("save-document", async content => {
                await Document.findByIdAndUpdate(documentId, { name: content.name, data: content.data })
            })
        }
    })

    // главная страница -- список всех длкументов 
    socket.on("get-all-documents", async () => {
        const allFilter = {};
        const documents = await Document.find(allFilter)
        socket.emit("receive-all-documents", documents)
    })

    socket.on("create-doc", async title => {
        document = await Document.create({ _id: uuidLib.v4(),  name: title, data: ""})
        socket.emit("doc-uuid", document._id)
    })
})

async function findDocument(id) {
    if (id == null) return null
    return await Document.findById(id)
}
