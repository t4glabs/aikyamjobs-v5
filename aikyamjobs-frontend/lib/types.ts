export interface Job {
  id: number;
  attributes: {
    title: string;
    slug: string;
    description: string;
    excerpt?: string;
    location: string;
    jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
    experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
    salary?: string;
    skills?: string[];
    impactArea?: string;
    applicationUrl?: string;
    applicationEmail?: string;
    closingDate?: string;
    publishDate?: string;
    curatedBy?: {
      data: Staff | null;
    };
    featured: boolean;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    featureImage?: any;
    socialImage?: any;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    company?: {
      data: Company;
    };
    categories?: {
      data: Category[];
    };
  };
}

export interface Staff {
  id: number;
  attributes: {
    name: string;
    role?: string;
    bio?: string;
    location?: string;
    profileLink?: string;
    avatar?: any;
  };
}

export interface Company {
  id: number;
  attributes: {
    name: string;
    slug: string;
    description?: string;
    excerpt?: string;
    logo?: any;
    featureImage?: any;
    socialImage?: any;
    website?: string;
    location?: string;
    size?: string;
    industry?: string;
    publishDate?: string;
    author?: string;
    featured?: boolean;
    metaTitle?: string;
    metaDescription?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

export interface Category {
  id: number;
  attributes: {
    name: string;
    slug: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

export interface Blog {
  id: number;
  attributes: {
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    featuredImage?: any;
    author?: string;
    publishDate?: string;
    featured: boolean;
    tags?: string[];
    readTime?: number;
    category?: 'newsletter' | 'blog' | 'case-study' | 'story' | 'guide';
    externalLink?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

export interface SiteSettings {
  id: number;
  attributes: {
    siteName: string;
    siteDescription?: string;
    heroTitle: string;
    heroSubtitle?: string;
    jobsSectionTitle: string;
    jobsLayoutType: 'grid' | 'list';
    jobsGridColumns: number;
    companiesSectionTitle: string;
    companiesLayoutType: 'grid' | 'list';
    companiesGridColumns: number;
    blogsSectionTitle: string;
    blogsLayoutType: 'grid' | 'list' | 'line';
    blogsGridColumns: number;
    showJobsOnHomepage: boolean;
    showCompaniesOnHomepage: boolean;
    showBlogsOnHomepage: boolean;
    homepageJobsLimit: number;
    homepageCompaniesLimit: number;
    homepageBlogsLimit: number;
    homepageTagsLimit: number;
    primaryColor?: string;
    logo?: any;
    socialLinks?: any;
    contactEmail?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: any;
    twitterCard?: 'summary' | 'summary_large_image';
    twitterSite?: string;
    favicon?: any;
    footerTagline?: string;
    footerCreditsLine?: string;
    footerResourceLinks?: Array<{ label: string; url: string }>;
    navLinks?: Array<{ label: string; url: string; external?: boolean }>;
  };
}

export interface Page {
  id: number;
  attributes: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    metaTitle?: string;
    metaDescription?: string;
    publishedAt: string;
  };
}

export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}
