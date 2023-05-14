import React, {useCallback, useEffect, useState } from 'react'
import Quill from "quill"
import "quill/dist/quill.snow.css"
import { io } from "socket.io-client"
import { useParams } from 'react-router-dom'

const SAVE_INTERVAL_MS = 2000

const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ align: []}],
    [{ list: "ordered" }, { list: "bullet" }],
]

export default function Editor() {
    const {id: documentId} = useParams();
    const [docName, setDocName] = useState("");
    const [socket, setSocket] = useState();
    const [quill, setQuill] = useState();
    const [exists, setExists] = useState(true);

    useEffect(() => {
        const s = io("http://localhost:3001")
        setSocket(s)

        return () => {
            s.disconnect()
        }
    }, [])

    // загрузить документ
    useEffect(() => {
        if (socket == null || quill == null) return

        socket.once("load-document", document => {
            if (document == null) {
                setExists(false);
            }
            else {
                setExists(true);
                setDocName(document.name);
                quill.setContents(document.data)
                quill.enable()
            }
        })

        socket.emit('get-document', documentId)
    }, [socket, quill, documentId])

    // сохранить документ
    useEffect(() => {
        if (socket == null || quill == null) return

        const interval = setInterval(() => {
            socket.emit('save-document', {name: docName, data: quill.getContents()})
        }, SAVE_INTERVAL_MS)

        return () => {
            clearInterval(interval)
        }
    }, [socket, quill, docName])

    // получение изменений
    useEffect(() => {
        if (socket == null || quill == null) return

        const handler = (delta) => {
            quill.updateContents(delta)
        }
        socket.on('receive-changes', handler)

        return () => {
            socket.off('receive-changes', handler)
        }
    }, [socket, quill])

    // отправить серверу изменения
    useEffect(() => { 
        if (socket == null || quill == null) return

        const handler = (delta, oldDelta, source) => {
            if (source !== 'user') return
            socket.emit("send-changes", delta)
        }
        quill.on('text-change', handler)

        return () => {
            quill.off('text-change', handler)
        }
    }, [socket, quill])

    const wrapperRef = useCallback((wrapper) => {
        wrapper.innerHTML = ""
        const editor = document.createElement('div')
        wrapper.append(editor)
        const q = new Quill(editor, { theme: "snow", modules: { toolbar: TOOLBAR_OPTIONS } })
        q.disable()
        setQuill(q)
    }, [])
    
    if (exists) {
        return (
            <div>
                {docName}
                <div className="container" ref={wrapperRef}></div>
            </div>
        )
    }
    else {
        return (
            <div>
                Document with given uuid doesn't exist
            </div>
        )
    }
}
