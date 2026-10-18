import { useState, useEffect, useMemo, useCallback } from "react";
import { SubjectPoint, ScatterData, OctantStatsMap } from "../types/admin";
import { OCTANT_SECTOR_CONFIGS } from "../constants/adminConstants";

export function useAdminData() {
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
  }, []);

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

  // 加载数据
  const loadData = async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/cohort/scatter");
      if (res.ok) {
        const data = await res.json();
        setScatterData(data);
      }
    } catch (e) {
      console.error("加载群体数据失败", e);
    } finally {
      setLoadingData(false);
    }
  };

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
      const res = await fetch(`/api/sessions/${sessionId}/report`);
      if (res.ok) {
        const rep = await res.json();
        setSelectedSubjectReport(rep);
      }
    } catch (e) {
      console.error("加载受测者报告失败", e);
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

  // 象区标题映射
  const quadrantTitles = useMemo(() => {
    const titles: Record<string, string> = {};
    subjects.forEach((s) => {
      if (s.quadrant_code && s.role_title && !titles[s.quadrant_code]) {
        titles[s.quadrant_code] = s.role_title;
      }
    });
    return titles;
  }, [subjects]);

  // 搜索和标签过滤
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        (s.role_title && s.role_title.toLowerCase().includes(query)) ||
        (s.quadrant_code && s.quadrant_code.toLowerCase().includes(query));

      const matchesTag =
        selectedTag === "ALL" ||
        s.quadrant_code === selectedTag ||
        s.role_title === selectedTag;

      return matchesSearch && matchesTag;
    });
  }, [subjects, searchQuery, selectedTag]);

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
  };
}
