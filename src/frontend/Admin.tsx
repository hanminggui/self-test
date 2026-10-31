import React, { useState, Suspense, lazy } from "react";
import { RefreshCw } from "lucide-react";

// 1. 导出类型、常量与纯函数 (保持向后兼容性)
export * from "./types/admin";
export * from "./constants/adminConstants";
export * from "./utils/manifoldUtils";

import { ViewMode, SplitLineType, SubjectPoint } from "./types/admin";
import { useAdminData } from "./hooks/useAdminData";

// 2. 核心架构组件
import AdminNavTabs from "./components/admin/AdminNavTabs";
import AdminSidebar from "./components/admin/AdminSidebar";
import SubjectDetailDrawer from "./components/admin/SubjectDetailDrawer";
import AdminLoginModal from "./components/admin/AdminLoginModal";
import ViewLoadingSkeleton from "./components/admin/ViewLoadingSkeleton";
import { ScopeSwitcherCapsule } from "./components/common/ScopeSwitcherCapsule";

// 3. 动态代码分割与按需懒加载 (Code-Splitting via React.lazy)
// 当前展示方案用不到的视图，代码包完全不会加载，仅在首次切换到该内容视图时异步加载对应 chunk
const CosmicGalaxyCompassView = lazy(
  () => import("./components/admin/views/CosmicGalaxyCompassView")
);
const CognitiveDomeView = lazy(
  () => import("./components/admin/views/CognitiveDomeView")
);
const SphericalDataBandView = lazy(
  () => import("./components/admin/views/SphericalDataBandView")
);
const BaguaDiagramView = lazy(
  () => import("./components/admin/views/BaguaDiagramView")
);
const RectangularPhaseView = lazy(
  () => import("./components/admin/views/RectangularPhaseView")
);
const SubjectDataTableView = lazy(
  () => import("./components/admin/views/SubjectDataTableView")
);

export default function Admin() {
  // 数据与状态层完全解耦至 Hook
  const {
    isAuthenticated,
    inputPassword,
    setInputPassword,
    authError,
    checkingAuth,
    handleManualLogin,

    scatterData,
    subjects,
    scope,
    setScope,
    tagCounts,
    octantStatsMap,
    quadrantTitles,
    overallStats,

    searchQuery,
    setSearchQuery,
    selectedTag,
    setSelectedTag,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    paginatedSubjects,

    selectedSubjectReport,
    setSelectedSubjectReport,
    handleOpenReport,
    handleDeleteSubject,
  } = useAdminData();

  // 视图与交互状态
  const [viewMode, setViewMode] = useState<ViewMode>("COMPASS");
  const [splitLine, setSplitLine] = useState<SplitLineType>("BASELINE");
  const [hoveredSubject, setHoveredSubject] = useState<SubjectPoint | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [compassHoverStatus, setCompassHoverStatus] = useState<string | null>(null);
  const [activeGlobeSector, setActiveGlobeSector] = useState<string>("Q1-CAL");

  // 1. 验证中加载界面
  if (checkingAuth) {
    return (
      <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-[#090a0f] text-slate-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-500" />
        正在验证访问凭据...
      </div>
    );
  }

  // 2. 锁屏登录界面
  if (!isAuthenticated) {
    return (
      <AdminLoginModal
        inputPassword={inputPassword}
        setInputPassword={setInputPassword}
        authError={authError}
        onSubmit={handleManualLogin}
      />
    );
  }

  // 3. 管理控制台主框架 (主视图面板 + 右侧自适应面板)
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#090a0f] text-slate-200 p-2.5 sm:p-3 flex flex-row gap-2.5 sm:gap-3">
      {/* 3.1 主展示面板：占满全屏，按视图动态按需懒加载 */}
      <div className="relative flex-1 h-full min-w-0 glass-panel rounded-2xl border border-white/5 overflow-hidden">
        {/* 左上角悬浮视图切换 Tabs */}
        <AdminNavTabs viewMode={viewMode} onSelectViewMode={setViewMode} />

        {/* 右上角范围切换胶囊 (全域宏观星系 | 好友社交圈 | 唯我本体) (GitHub Issue #20) */}
        <div className="absolute top-3 right-3 z-30 flex items-center">
          <ScopeSwitcherCapsule
            scope={scope}
            onScopeChange={setScope}
            friendCount={subjects.filter((s) => s.is_friend).length}
          />
        </div>

        {/* 动态懒加载视图区：配备微光骨架屏，按需加载 Chunk，零冗余开销 */}
        <Suspense fallback={<ViewLoadingSkeleton viewName={viewMode} />}>
          {viewMode === "COMPASS" && (
            <CosmicGalaxyCompassView
              subjects={subjects}
              onOpenReport={handleOpenReport}
              octantStatsMap={octantStatsMap}
              isRotating={isRotating}
              onToggleRotating={() => setIsRotating((prev) => !prev)}
              onHoverStatusChange={setCompassHoverStatus}
              onActiveSectorChange={setActiveGlobeSector}
            />
          )}

          {viewMode === "DOME" && (
            <CognitiveDomeView
              subjects={subjects}
              onOpenReport={handleOpenReport}
              octantStatsMap={octantStatsMap}
              onHoverStatusChange={setCompassHoverStatus}
              onActiveSectorChange={setActiveGlobeSector}
            />
          )}

          {viewMode === "BAND" && (
            <SphericalDataBandView
              subjects={subjects}
              onOpenReport={handleOpenReport}
              octantStatsMap={octantStatsMap}
              onHoverStatusChange={setCompassHoverStatus}
              onActiveSectorChange={setActiveGlobeSector}
            />
          )}

          {viewMode === "BAGUA" && (
            <BaguaDiagramView
              subjects={subjects}
              onOpenReport={handleOpenReport}
              octantStatsMap={octantStatsMap}
              onHoverStatusChange={setCompassHoverStatus}
              onActiveSectorChange={setActiveGlobeSector}
            />
          )}

          {viewMode === "RECT" && (
            <RectangularPhaseView
              subjects={subjects}
              scatterData={scatterData}
              splitLine={splitLine}
              onOpenReport={handleOpenReport}
              hoveredSubject={hoveredSubject}
              setHoveredSubject={setHoveredSubject}
              onActiveSectorChange={setActiveGlobeSector}
            />
          )}

          {viewMode === "TABLE" && (
            <SubjectDataTableView
              allSubjects={subjects}
              tagCounts={tagCounts}
              selectedTag={selectedTag}
              setSelectedTag={(tag) => {
                setSelectedTag(tag);
                if (tag && tag !== "ALL") {
                  setActiveGlobeSector(tag);
                }
              }}
              quadrantTitles={quadrantTitles}
              paginatedSubjects={paginatedSubjects}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              pageSize={pageSize}
              setPageSize={setPageSize}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              onOpenReport={handleOpenReport}
              onDeleteSubject={handleDeleteSubject}
            />
          )}
        </Suspense>
      </div>

      {/* 3.2 右侧自适应面板：展示当前象限/象区的全维 B 端画像解读档案与核心全局指标 */}
      <AdminSidebar
        viewMode={viewMode}
        isRotating={isRotating}
        onToggleRotating={() => setIsRotating((prev) => !prev)}
        compassHoverStatus={compassHoverStatus}
        activeGlobeSector={activeGlobeSector}
        onSelectActiveSector={setActiveGlobeSector}
        octantStatsMap={octantStatsMap}
        splitLine={splitLine}
        onSelectSplitLine={setSplitLine}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalTableItems={totalItems}
        overallStats={overallStats}
        tagCounts={tagCounts}
        selectedTag={selectedTag}
        onSelectTag={(tag) => {
          setSelectedTag?.(tag);
          if (tag && tag !== "ALL") {
            setActiveGlobeSector(tag);
          }
        }}
        quadrantTitles={quadrantTitles}
      />

      {/* 3.3 调阅完整报告详情 Drawer 弹窗 */}
      {selectedSubjectReport && (
        <SubjectDetailDrawer
          report={selectedSubjectReport}
          onClose={() => setSelectedSubjectReport(null)}
          onDelete={handleDeleteSubject}
        />
      )}
    </div>
  );
}
