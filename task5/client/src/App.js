import Editor from './Editor'
import MainPage from './MainPage'
import {
    BrowserRouter as Router,
    Routes,
    Route
} from 'react-router-dom'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" exact element={<MainPage/>} />
                <Route path="documents/:id" element={<Editor/>} />
            </Routes>
        </Router>
    )
}

export default App;
