import React, {useEffect, useState} from 'react'
import {
    Link,
    useNavigate 
} from 'react-router-dom'
import { io } from "socket.io-client"

export default function MainPage() {
    const navigate = useNavigate();
    const [socket, setSocket] = useState();
    const [docs, setDocs] = useState([]);
    const [docName, setDocName] = useState("");

    useEffect(() => {
        const s = io("http://localhost:3001")
        setSocket(s)

        return () => {
            s.disconnect()
        }
    }, [])

    useEffect(() => {
        if (socket == null) return
        socket.emit('get-all-documents')
    }, [socket])

    useEffect(() => {
        if (socket == null) return

        const handler = (documents) => {
            setDocs(documents)
        }
        socket.on('receive-all-documents', handler)

        return () => {
            socket.off('receive-all-documentss', handler)
        }
    }, [socket])

    useEffect(() => {
        if (socket == null) return

        const handler = (uuid) => {
            navigate(`/documents/${uuid}`)
        }
        socket.on('doc-uuid', handler)

        return () => {
            socket.off('doc-uuid', handler)
        }
    }, [socket, navigate])

    const OnChangeName = (e) => {
        setDocName(e.target.value)
    }

    return (
        <div>
            <input type="text" name="name" value={docName} onChange={OnChangeName}/>
            <button
                type='button'
                onClick={() => socket.emit("create-doc", docName)}
            >
                Add
            </button>
            
            {docs.map((document, i) => {
                    return (
                        <div>
                            <Link to={`/documents/${document._id}`} activeClassName="active">{document.name}</Link>
                            <br/>
                        </div>
                    )
                }
            )}
        </div>
    )
}
