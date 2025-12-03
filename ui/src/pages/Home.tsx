import TemplateCard from '../components/TemplateCard'

function Home() {
  return (
    <div className="min-h-screen bg-deep-blue">
      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-20 text-center overflow-hidden">
        {/* 배경 패턴 (기하학적 원형/오비탈) */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-soft-blue rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-neoblue rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-accent-mint rounded-full"></div>
        </div>

        {/* 메인 문구 */}
        <div className="relative z-10">
          <h1 
            className="font-inter font-bold mb-4"
            style={{
              fontSize: 'clamp(3.375rem, 5vw + 1rem, 5.4rem)'
            }}
          >
            <div 
              className="bg-gradient-to-r from-[#A0A8C2] via-[#A0A8C2] to-[#C8D0E8] bg-clip-text text-transparent animate-fade-in-up-delay-1"
            >
              Manage your photos
            </div>
            <div className="bg-gradient-to-r from-neoblue to-accent-mint bg-clip-text text-transparent animate-fade-in-up-delay-2">
              more efficiently
            </div>
          </h1>
          <p className="text-xl md:text-2xl text-white mt-6 animate-fade-in-up-delay-3">
            효율적인 사진 작업으로 행정 업무를 더욱 스마트하게
          </p>
        </div>
      </section>

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

export default Home
