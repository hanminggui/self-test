import { useState, useEffect, useMemo, useCallback } from "react";
import { SubjectPoint, ScatterData, OctantStatsMap } from "../types/admin";
import { OCTANT_SECTOR_CONFIGS, getQuadrantPresets } from "../constants/adminConstants";
import { useLocale } from "../contexts/LocaleContext";
import { getArchetypeDefinition } from "../../backend/archetype_matrix";

export function useAdminData() {
  const { locale } = useLocale();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 核心数据
  const [scatterData, setScatterData] = useState<ScatterData | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // 表格与搜索过滤状态
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedSubjectReport, setSelectedSubjectReport] = useState<any | null>(null);

  // 过滤或分页尺寸改变时重置为第 1 页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTag, pageSize]);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/cohort/scatter?lang=${encodeURIComponent(locale)}`);
      if (res.ok) {
        const data = await res.json();
        setScatterData(data);
      }
    } catch (e) {
      console.error("加载群体数据失败", e);
    } finally {
      setLoadingData(false);
    }
  }, [locale]);

  // 令牌校验
  const verifyToken = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_token", token);
        loadData();
      } else {
        setAuthError("访问密码或免密令牌无效，请重新输入");
      }
    } catch {
      setAuthError("网络连接失败");
    } finally {
      setCheckingAuth(false);
    }
  }, [loadData]);

  // 当 locale 改变且已验证登录时，自动重新加载本地化数据
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [locale, isAuthenticated, loadData]);

  // 页面初始化时检查凭证
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenInUrl = urlParams.get("token");
    if (tokenInUrl) {
      verifyToken(tokenInUrl);
      return;
    }

    const savedToken = sessionStorage.getItem("admin_token");
    if (savedToken) {
      verifyToken(savedToken);
      return;
    }

    setCheckingAuth(false);
  }, [verifyToken]);

  // 手动登录提交
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword.trim()) return;
    setCheckingAuth(true);
    setAuthError("");
    verifyToken(inputPassword.trim());
  };

  // 打开个人报告详情
  const handleOpenReport = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/report?lang=${encodeURIComponent(locale)}`);
      if (res.ok) {
        const rep = await res.json();
        setSelectedSubjectReport(rep);
      }
    } catch (e) {
      console.error("加载受测者报告失败", e);
    }
  };

  // 删除单条受测者记录
  const handleDeleteSubject = async (sessionId: string, subjectName?: string) => {
    const displayName = subjectName || sessionId;
    if (!window.confirm(`确定要彻底删除受测者「${displayName}」的数据记录吗？\n删除后该记录将无法恢复。`)) {
      return false;
    }

    const token = sessionStorage.getItem("admin_token") || new URLSearchParams(window.location.search).get("token") || "";
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setScatterData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            subjects: prev.subjects.filter((s) => s.id !== sessionId),
          };
        });
        if (selectedSubjectReport?.session_id === sessionId) {
          setSelectedSubjectReport(null);
        }
        loadData();
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`删除失败: ${err.error || "网络或权限错误"}`);
        return false;
      }
    } catch (e) {
      console.error("删除受测者失败", e);
      alert("删除失败，网络请求异常");
      return false;
    }
  };

  const subjects = scatterData?.subjects || [];

  // 各标签频次统计
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: subjects.length };
    subjects.forEach((s) => {
      const code = s.quadrant_code;
      if (code) {
        counts[code] = (counts[code] || 0) + 1;
      }
    });
    return counts;
  }, [subjects]);

  // 8 象区详尽统计指标 Map
  const octantStatsMap = useMemo(() => {
    const total = subjects.length || 1;
    const stats: OctantStatsMap = {};

    Object.keys(OCTANT_SECTOR_CONFIGS).forEach((code) => {
      const cohort = subjects.filter((s) => s.quadrant_code === code);
      const count = cohort.length;
      const percentage = ((count / total) * 100).toFixed(1);
      const avgDStar =
        count > 0 ? (cohort.reduce((a, b) => a + (b.d_star ?? 0.5), 0) / count).toFixed(3) : "--";
      const avgMRatio =
        count > 0 ? (cohort.reduce((a, b) => a + b.m_ratio, 0) / count).toFixed(2) : "--";
      const avgScore =
        count > 0 ? Math.round(cohort.reduce((a, b) => a + b.final_score, 0) / count) : 0;
      stats[code] = { count, percentage, avgDStar, avgMRatio, avgScore };
    });

    return stats;
  }, [subjects]);

  // 象区标题映射 (支持当前语言预设与动态覆盖)
  const quadrantTitles = useMemo(() => {
    const titles: Record<string, string> = {};
    getQuadrantPresets(locale).forEach((p) => {
      titles[p.code] = p.defaultTitle;
    });
    subjects.forEach((s) => {
      if (s.quadrant_code) {
        const def = getArchetypeDefinition(s.quadrant_code, locale);
        titles[s.quadrant_code] = def.role_title;
      }
    });
    return titles;
  }, [subjects, locale]);

  // 搜索和标签过滤
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const def = s.quadrant_code ? getArchetypeDefinition(s.quadrant_code, locale) : null;
      const roleTitle = def?.role_title || s.role_title || "";
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        roleTitle.toLowerCase().includes(query) ||
        (s.quadrant_code && s.quadrant_code.toLowerCase().includes(query));

      const matchesTag =
        selectedTag === "ALL" ||
        s.quadrant_code === selectedTag ||
        roleTitle === selectedTag;

      return matchesSearch && matchesTag;
    });
  }, [subjects, searchQuery, selectedTag, locale]);

  // 分页数据
  const totalItems = filteredSubjects.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex);

  // 全局 4 个小巧统计指标
  const overallStats = useMemo(() => {
    const total = subjects.length;
    const avgDStar =
      total > 0
        ? (subjects.reduce((a, b) => a + (b.d_star ?? 0.5), 0) / total).toFixed(3)
        : "--";
    const avgMRatio =
      total > 0 ? (subjects.reduce((a, b) => a + b.m_ratio, 0) / total).toFixed(2) : "--";
    const maxScore = total > 0 ? Math.max(...subjects.map((s) => s.final_score)) : 0;

    return { total, avgDStar, avgMRatio, maxScore };
  }, [subjects]);

  return {
    isAuthenticated,
    inputPassword,
    setInputPassword,
    authError,
    checkingAuth,
    handleManualLogin,

    scatterData,
    loadingData,
    loadData,
    subjects,

    tagCounts,
    octantStatsMap,
    quadrantTitles,
    overallStats,

    searchQuery,
    setSearchQuery,
    selectedTag,
    setSelectedTag,
    currentPage: safeCurrentPage,
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
  };
}
