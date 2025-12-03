import { useEffect, useState } from 'react'
import { useProjectStore } from '../stores/projectStore'
import ProjectModal from '../components/ProjectModal'

function ProjectList() {
  const { projectList, addProject, updateProject, deleteProject, loadProjects } = useProjectStore()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  useEffect(() => {
    // 컴포넌트 마운트 시 LocalStorage에서 데이터 로드
    loadProjects()
  }, [loadProjects])

  const handleAddProject = (projectName: string) => {
    addProject(projectName)
  }

  const handleEditClick = (index: number) => {
    setEditingIndex(index)
    setIsEditModalOpen(true)
  }

  const handleUpdateProject = (projectName: string) => {
    if (editingIndex !== null) {
      updateProject(editingIndex, projectName)
      setEditingIndex(null)
    }
  }

  const handleDeleteClick = (index: number) => {
    if (window.confirm('이 사업을 삭제하시겠습니까?')) {
      deleteProject(index)
    }
  }

  const editingProjectName = editingIndex !== null ? projectList[editingIndex] : ''

  return (
    <div className="min-h-screen bg-deep-blue">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-suit font-bold text-white">
            사업 리스트
          </h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-neoblue text-white px-6 py-2 rounded-lg hover:bg-neoblue/90 hover:shadow-[0_0_15px_rgba(76,111,255,0.5)] transition-all duration-200 flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            <span>사업 추가</span>
          </button>
        </div>

        {/* Project List Table */}
        <div className="bg-deep-blue border border-soft-blue rounded-xl p-6">
          {projectList.length === 0 ? (
            <div className="text-center py-12 text-sub-text">
              등록된 사업이 없습니다. + 사업 추가 버튼을 클릭하여 사업을 추가하세요.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-soft-blue/30">
                  <th className="text-left py-3 text-soft-blue font-suit font-medium">사업명</th>
                  <th className="text-right py-3 text-soft-blue font-suit font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {projectList.map((project, index) => (
                  <tr
                    key={index}
                    className="border-b border-soft-blue/10 hover:bg-soft-blue/5 transition-colors"
                  >
                    <td className="py-4 text-white font-suit">{project}</td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleEditClick(index)}
                          className="text-neoblue hover:text-accent-mint hover:scale-110 transition-all duration-200"
                          title="수정"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(index)}
                          className="text-red-500 hover:text-red-400 hover:scale-110 transition-all duration-200"
                          title="삭제"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      <ProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConfirm={handleAddProject}
        title="사업 추가"
        confirmText="추가"
      />

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingIndex(null)
        }}
        onConfirm={handleUpdateProject}
        initialValue={editingProjectName}
        title="사업명 수정"
        confirmText="수정"
      />
    </div>
  )
}

export default ProjectList
