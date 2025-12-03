import TemplateCard from '../components/TemplateCard'

function Upload() {
  return (
    <div className="min-h-screen bg-deep-blue">
      {/* Template Selection Section */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-4xl md:text-5xl font-suit font-bold text-white text-center mb-2">
          템플릿 선택
        </h2>
        <p className="text-lg text-sub-text text-center mb-12">
          원하는 레이아웃과 방향을 선택하여 시작하세요
        </p>

        {/* Template Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <TemplateCard type="2컷" icon="2" />
          <TemplateCard type="4컷" icon="4" />
          <TemplateCard type="6컷" icon="6" />
          <TemplateCard type="커스텀" icon="∞" />
        </div>
      </section>
    </div>
  )
}

export default Upload

