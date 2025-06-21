// TypeScript Interfaces
export interface Therapy {
  id: string;
  name: string;
  manufacturer: string;
  mechanism: string;
  price_per_treatment_usd: number;
  sources: string[];
  last_updated: string;
}

interface Disease {
  id: string; // "DLBCL", "PMBCL", "PEDIATRIC_B_ALL"
  name: string; // "Diffuse Large B-Cell Lymphoma"
  category: string; // "Hematologic Malignancy", "Solid Tumor"
  subcategory?: string; // "B-Cell Lymphoma", "Leukemia"
  icd_10_code?: string; // "C83.3"
  annual_incidence_us?: number; // Cases per year
  sources: string[];
  last_updated: string;
}

export interface TherapyApproval {
  id: string;
  therapy_id: string;
  disease_id: string;
  region: string;
  approval_date: string;
  approval_type: string;
  regulatory_body: string;
  sources: string[];
  last_updated: string;
}

export interface TherapyRevenue {
  id: string;
  therapy_id: string;
  period: string;
  region: string;
  revenue_millions_usd: number;
  sources: string[];
  last_updated: string;
}

// Therapies Data
export const therapies: Therapy[] = [
  {
    id: "YESCARTA",
    name: "Yescarta",
    manufacturer: "Gilead",
    mechanism: "CAR-T",
    price_per_treatment_usd: 373000, // US standard price
    sources: ["Gilead product information"],
    last_updated: "2023-01-01",
  },
  {
    id: "KYMRIAH",
    name: "Kymriah",
    manufacturer: "Novartis",
    mechanism: "CAR-T",
    price_per_treatment_usd: 475000, // US standard price
    sources: ["Novartis product information"],
    last_updated: "2024-01-01",
  },
];

// Diseases Data
export const diseases: Disease[] = [
  {
    id: "DLBCL",
    name: "Diffuse Large B-Cell Lymphoma",
    category: "Hematologic Malignancy",
    subcategory: "B-Cell Lymphoma",
    icd_10_code: "C83.3",
    annual_incidence_us: 27000,
    sources: ["American Cancer Society", "SEER database"],
    last_updated: "2024-01-01",
  },
  {
    id: "PMBCL",
    name: "Primary Mediastinal B-Cell Lymphoma",
    category: "Hematologic Malignancy",
    subcategory: "B-Cell Lymphoma",
    icd_10_code: "C85.2",
    annual_incidence_us: 1500,
    sources: ["National Cancer Institute", "SEER database"],
    last_updated: "2024-01-01",
  },
  {
    id: "PEDIATRIC_B_ALL",
    name: "Pediatric B-cell Acute Lymphoblastic Leukemia",
    category: "Hematologic Malignancy",
    subcategory: "Acute Leukemia",
    icd_10_code: "C91.0",
    annual_incidence_us: 3000,
    sources: ["Children's Oncology Group", "SEER database"],
    last_updated: "2024-01-01",
  },
];

// Therapy Approvals Data
export const therapyApprovals: TherapyApproval[] = [
  // YESCARTA Approvals
  {
    id: "YES_DLBCL_US",
    therapy_id: "YESCARTA",
    disease_id: "DLBCL",
    region: "US",
    approval_date: "2017-10-18",
    approval_type: "Full",
    regulatory_body: "FDA",
    sources: ["FDA approval letter"],
    last_updated: "2023-01-01",
  },
  {
    id: "YES_DLBCL_EU",
    therapy_id: "YESCARTA",
    disease_id: "DLBCL",
    region: "Europe",
    approval_date: "2018-08-23",
    approval_type: "Conditional",
    regulatory_body: "EMA",
    sources: ["EMA approval letter"],
    last_updated: "2023-01-01",
  },
  {
    id: "YES_PMBCL_US",
    therapy_id: "YESCARTA",
    disease_id: "PMBCL",
    region: "US",
    approval_date: "2017-10-18",
    approval_type: "Full",
    regulatory_body: "FDA",
    sources: ["FDA approval letter"],
    last_updated: "2023-01-01",
  },
  // KYMRIAH Approvals
  {
    id: "KYM_BALL_US",
    therapy_id: "KYMRIAH",
    disease_id: "PEDIATRIC_B_ALL",
    region: "US",
    approval_date: "2017-08-30",
    approval_type: "Full",
    regulatory_body: "FDA",
    sources: ["FDA approval letter"],
    last_updated: "2024-01-01",
  },
  {
    id: "KYM_DLBCL_US",
    therapy_id: "KYMRIAH",
    disease_id: "DLBCL",
    region: "US",
    approval_date: "2018-05-01",
    approval_type: "Full",
    regulatory_body: "FDA",
    sources: ["FDA approval letter"],
    last_updated: "2024-01-01",
  },
  {
    id: "KYM_BALL_EU",
    therapy_id: "KYMRIAH",
    disease_id: "PEDIATRIC_B_ALL",
    region: "Europe",
    approval_date: "2018-08-22",
    approval_type: "Conditional",
    regulatory_body: "EMA",
    sources: ["EMA approval letter"],
    last_updated: "2024-01-01",
  },
  {
    id: "KYM_DLBCL_EU",
    therapy_id: "KYMRIAH",
    disease_id: "DLBCL",
    region: "Europe",
    approval_date: "2018-12-20",
    approval_type: "Conditional",
    regulatory_body: "EMA",
    sources: ["EMA approval letter"],
    last_updated: "2024-01-01",
  },
];

// Therapy Revenue Data
export const therapyRevenue: TherapyRevenue[] = [
  // YESCARTA 2023 Data
  {
    id: "YES_2023_Q1_US",
    therapy_id: "YESCARTA",
    period: "2023-Q1",
    region: "US",
    revenue_millions_usd: 195,
    sources: ["Gilead Q1 2023"],
    last_updated: "2023-05-02",
  },
  {
    id: "YES_2023_Q1_EU",
    therapy_id: "YESCARTA",
    period: "2023-Q1",
    region: "Europe",
    revenue_millions_usd: 125,
    sources: ["Gilead Q1 2023"],
    last_updated: "2023-05-02",
  },
  {
    id: "YES_2023_Q1_OTH",
    therapy_id: "YESCARTA",
    period: "2023-Q1",
    region: "Other",
    revenue_millions_usd: 28,
    sources: ["Gilead Q1 2023"],
    last_updated: "2023-05-02",
  },
  {
    id: "YES_2023_Q2_US",
    therapy_id: "YESCARTA",
    period: "2023-Q2",
    region: "US",
    revenue_millions_usd: 208,
    sources: ["Gilead Q2 2023"],
    last_updated: "2023-08-01",
  },
  {
    id: "YES_2023_Q2_EU",
    therapy_id: "YESCARTA",
    period: "2023-Q2",
    region: "Europe",
    revenue_millions_usd: 142,
    sources: ["Gilead Q2 2023"],
    last_updated: "2023-08-01",
  },
  {
    id: "YES_2023_Q2_OTH",
    therapy_id: "YESCARTA",
    period: "2023-Q2",
    region: "Other",
    revenue_millions_usd: 35,
    sources: ["Gilead Q2 2023"],
    last_updated: "2023-08-01",
  },
  {
    id: "YES_2023_Q3_US",
    therapy_id: "YESCARTA",
    period: "2023-Q3",
    region: "US",
    revenue_millions_usd: 221,
    sources: ["Gilead Q3 2023"],
    last_updated: "2023-11-02",
  },
  {
    id: "YES_2023_Q3_US",
    therapy_id: "KYMRIAH",
    period: "2023-Q3",
    region: "US",
    revenue_millions_usd: 621,
    sources: ["Gilead Q3 2023"],
    last_updated: "2023-11-02",
  },
  {
    id: "YES_2023_Q3_EU",
    therapy_id: "YESCARTA",
    period: "2023-Q3",
    region: "Europe",
    revenue_millions_usd: 140,
    sources: ["Gilead Q3 2023"],
    last_updated: "2023-11-02",
  },
  {
    id: "YES_2023_Q3_OTH",
    therapy_id: "YESCARTA",
    period: "2023-Q3",
    region: "Other",
    revenue_millions_usd: 35,
    sources: ["Gilead Q3 2023"],
    last_updated: "2023-11-02",
  },
  {
    id: "YES_2023_Q4_US",
    therapy_id: "YESCARTA",
    period: "2023-Q4",
    region: "US",
    revenue_millions_usd: 187,
    sources: ["Gilead Q4 2023"],
    last_updated: "2024-02-06",
  },
  {
    id: "YES_2023_Q4_EU",
    therapy_id: "YESCARTA",
    period: "2023-Q4",
    region: "Europe",
    revenue_millions_usd: 140,
    sources: ["Gilead Q4 2023"],
    last_updated: "2024-02-06",
  },
  {
    id: "YES_2023_Q4_OTH",
    therapy_id: "YESCARTA",
    period: "2023-Q4",
    region: "Other",
    revenue_millions_usd: 42,
    sources: ["Gilead Q4 2023"],
    last_updated: "2024-02-06",
  },
  // KYMRIAH 2024 Data
  {
    id: "KYM_2024_Q1_US",
    therapy_id: "KYMRIAH",
    period: "2024-Q1",
    region: "US",
    revenue_millions_usd: 85,
    sources: ["Novartis Q1 2024"],
    last_updated: "2024-04-25",
  },
  {
    id: "KYM_2024_Q1_EU",
    therapy_id: "KYMRIAH",
    period: "2024-Q1",
    region: "Europe",
    revenue_millions_usd: 35,
    sources: ["Novartis Q1 2024"],
    last_updated: "2024-04-25",
  },
  {
    id: "KYM_2024_Q1_OTH",
    therapy_id: "KYMRIAH",
    period: "2024-Q1",
    region: "Other",
    revenue_millions_usd: 15,
    sources: ["Novartis Q1 2024"],
    last_updated: "2024-04-25",
  },
  {
    id: "KYM_2024_Q2_US",
    therapy_id: "KYMRIAH",
    period: "2024-Q2",
    region: "US",
    revenue_millions_usd: 78,
    sources: ["Novartis Q2 2024"],
    last_updated: "2024-07-25",
  },
  {
    id: "KYM_2024_Q2_EU",
    therapy_id: "KYMRIAH",
    period: "2024-Q2",
    region: "Europe",
    revenue_millions_usd: 32,
    sources: ["Novartis Q2 2024"],
    last_updated: "2024-07-25",
  },
  {
    id: "KYM_2024_Q2_OTH",
    therapy_id: "KYMRIAH",
    period: "2024-Q2",
    region: "Other",
    revenue_millions_usd: 12,
    sources: ["Novartis Q2 2024"],
    last_updated: "2024-07-25",
  },
  {
    id: "KYM_2024_Q3_US",
    therapy_id: "KYMRIAH",
    period: "2024-Q3",
    region: "US",
    revenue_millions_usd: 72,
    sources: ["Novartis Q3 2024"],
    last_updated: "2024-10-25",
  },
  {
    id: "KYM_2024_Q3_EU",
    therapy_id: "KYMRIAH",
    period: "2024-Q3",
    region: "Europe",
    revenue_millions_usd: 28,
    sources: ["Novartis Q3 2024"],
    last_updated: "2024-10-25",
  },
  {
    id: "KYM_2024_Q3_OTH",
    therapy_id: "KYMRIAH",
    period: "2024-Q3",
    region: "Other",
    revenue_millions_usd: 10,
    sources: ["Novartis Q3 2024"],
    last_updated: "2024-10-25",
  },
  {
    id: "KYM_2024_Q4_US",
    therapy_id: "KYMRIAH",
    period: "2024-Q4",
    region: "US",
    revenue_millions_usd: 65,
    sources: ["Novartis Q4 2024"],
    last_updated: "2025-01-30",
  },
  {
    id: "KYM_2024_Q4_EU",
    therapy_id: "KYMRIAH",
    period: "2024-Q4",
    region: "Europe",
    revenue_millions_usd: 25,
    sources: ["Novartis Q4 2024"],
    last_updated: "2025-01-30",
  },
  {
    id: "KYM_2024_Q4_OTH",
    therapy_id: "KYMRIAH",
    period: "2024-Q4",
    region: "Other",
    revenue_millions_usd: 18,
    sources: ["Novartis Q4 2024"],
    last_updated: "2025-01-30",
  },
];
