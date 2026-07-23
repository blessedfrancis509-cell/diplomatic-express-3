import React, { useState, useEffect } from "react";
import { Newspaper, Clock, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface NewsArticle {
  id: number;
  title: string;
  summary: string | null;
  content: string;
  image_url: string | null;
  category: string;
  is_published: number;
  created_at: string;
}

const CATEGORIES = ["All", "Company News", "Industry Updates", "Logistics Tips", "Promotions", "General"];

const FALLBACK_IMAGES: Record<string, string> = {
  "Company News": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
  "Industry Updates": "https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19?auto=format&fit=crop&w=800&q=80",
  "Logistics Tips": "https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?auto=format&fit=crop&w=800&q=80",
  "Promotions": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
  "General": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
};

export const News = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => setArticles(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeCategory === "All" ? articles : articles.filter((a) => a.category === activeCategory);

  const getImage = (article: NewsArticle) => article.image_url || FALLBACK_IMAGES[article.category] || FALLBACK_IMAGES["General"];

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Company News": return "bg-brand-secondary/10 text-brand-secondary";
      case "Industry Updates": return "bg-indigo-100 text-indigo-600";
      case "Logistics Tips": return "bg-emerald-100 text-emerald-600";
      case "Promotions": return "bg-amber-100 text-amber-600";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  if (loading) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 md:px-6 space-y-16">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-brand-secondary/10 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <Newspaper size={32} className="text-brand-secondary" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-brand-primary tracking-tight">News & Updates</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-slate-100 rounded-2xl mb-4" />
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-50 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-20 max-w-7xl mx-auto px-4 md:px-6 space-y-8 md:space-y-16">
      <div className="text-center space-y-4 md:space-y-6 max-w-3xl mx-auto">
        <div className="w-16 h-16 bg-brand-secondary/10 rounded-2xl flex items-center justify-center mx-auto">
          <Newspaper size={32} className="text-brand-secondary" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-brand-primary tracking-tight">News & Updates</h2>
        <p className="text-base md:text-lg text-slate-500">Stay informed with the latest from Diplomatic Xpress Logistics.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:justify-center md:flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${
              activeCategory === cat ? "bg-brand-secondary text-white shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <Newspaper size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold">No articles found{activeCategory !== "All" ? ` in "${activeCategory}"` : ""}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((article, i) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedArticle(article)}
              className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden cursor-pointer group hover:shadow-2xl hover:border-brand-secondary/20 transition-all flex flex-col"
            >
              <div className="relative h-48 md:h-56 overflow-hidden">
                <img
                  src={getImage(article)}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getCategoryColor(article.category)}`}>
                    {article.category}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-lg font-black text-white leading-tight line-clamp-2">{article.title}</h3>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                {article.summary && (
                  <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2">{article.summary}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold">{new Date(article.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="text-brand-secondary text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read More <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedArticle && (
        <div
          className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-end md:items-center justify-center z-[60] p-0 md:p-4"
          onClick={() => setSelectedArticle(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white w-full md:max-w-3xl md:rounded-[2rem] rounded-t-[2rem] max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-56 md:h-72 shrink-0">
              <img
                src={getImage(selectedArticle)}
                alt={selectedArticle.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-4 right-4">
                <button onClick={() => setSelectedArticle(null)} className="w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all text-lg font-bold">
                  X
                </button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 space-y-2">
                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getCategoryColor(selectedArticle.category)}`}>
                  {selectedArticle.category}
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">{selectedArticle.title}</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={14} />
                <span className="text-xs font-bold">{new Date(selectedArticle.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
              {selectedArticle.summary && (
                <p className="text-base md:text-lg text-slate-600 leading-relaxed font-medium italic border-l-4 border-brand-secondary pl-4">{selectedArticle.summary}</p>
              )}
              <div className="prose prose-slate max-w-none text-sm md:text-base leading-relaxed text-slate-600 whitespace-pre-wrap">
                {selectedArticle.content}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
