import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Upload from './pages/Upload'
import ProjectList from './pages/ProjectList'
import Editor from './pages/Editor'
import Layout from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </Layout>
  )
}

export default App

