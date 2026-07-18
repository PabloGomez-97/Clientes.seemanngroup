import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

import { imgUrl } from "@/config/images";
import { getRecentPosts, getHomeSlides } from "@/services/contentful";
import type { BlogPost } from "@/services/contentful";
import "../styles/Home.css";
import ActivityBar from "../cotizaciones/ActivityBar";
import HomeHeroCarousel, { type HeroSlide } from "./HomeHeroCarousel";
import HomeServicesGrid from "./HomeServicesGrid";
import HomeCarriersCarousel from "./HomeCarriersCarousel";
import HomeOperationStrip from "./HomeOperationStrip";
import { useAuth } from "@/auth/AuthContext";
import { useHomeShipments } from "@/hooks/useHomeShipments";

const HERO_PRIMARY_SLIDE_IMAGE = "/insights11.png";

function resolveHeroSlideImage(
  imageUrl: string | null | undefined,
  index: number,
): string {
  if (index === 0 && (!imageUrl || imageUrl.includes("insights1.png"))) {
    return imgUrl(HERO_PRIMARY_SLIDE_IMAGE);
  }
  return imageUrl || imgUrl("/insights1.png");
}

const FALLBACK_SLIDES = (t: (k: string) => string): HeroSlide[] => [
  {
    image: imgUrl(HERO_PRIMARY_SLIDE_IMAGE),
    title: t("home.slide1.title"),
    subtitle: t("home.slide1.subtitle"),
    button: { text: t("home.slide1.button"), link: "/promesas" },
  },
  {
    image: imgUrl("/insights3.png"),
    title: "",
    subtitle: "",
    button: { text: "", link: "/trackings" },
    dynamic: true,
  },
];

const Home: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeUsername } = useAuth();
  const { items: shipments, activeCount, loading: shipmentsLoading } =
    useHomeShipments(activeUsername);

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(() =>
    FALLBACK_SLIDES(t),
  );

  useEffect(() => {
    getRecentPosts(4).then((posts) => {
      setBlogPosts(posts);
      setBlogLoading(false);
    });
  }, []);

  useEffect(() => {
    getHomeSlides().then((cmsSlides) => {
      if (cmsSlides.length === 0) {
        setHeroSlides(FALLBACK_SLIDES(t));
        return;
      }
      const primary = cmsSlides[0];
      const mapped: HeroSlide[] = [
        {
          image: resolveHeroSlideImage(primary.imageUrl, 0),
          title: primary.title,
          subtitle: primary.subtitle,
          button: { text: primary.buttonText, link: primary.buttonLink },
        },
        {
          image: imgUrl("/insights3.png"),
          title: "",
          subtitle: "",
          button: { text: "", link: "/trackings" },
          dynamic: true,
        },
      ];
      setHeroSlides(mapped);
    });
  }, [t]);

  const dateLocale = i18n.language === "es" ? es : enUS;
  const formatBlogDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="hme-shell">
      <ActivityBar items={shipments} loading={shipmentsLoading} />

      <div className="hme-hero-wrap">
        <HomeHeroCarousel slides={heroSlides} activeShipmentsCount={activeCount} />
      </div>

      <div className="hme-main">
        <HomeOperationStrip
          shipments={shipments}
          shipmentsLoading={shipmentsLoading}
        />

        <HomeServicesGrid />

        <HomeCarriersCarousel />

        <section className="hme-section" aria-label={t("home.news.subtitle")}>
          <header className="hme-section__head">
            <span className="hme-section__eyebrow">{t("home.news.title")}</span>
            <h2 className="hme-section__title">{t("home.news.subtitle")}</h2>
          </header>

          <div className="hme-news">
            {blogLoading
              ? [1, 2, 3, 4].map((i) => (
                  <div key={i} className="hme-news-card" aria-hidden="true">
                    <div className="hme-news-card__media hme-skeleton" />
                    <div className="hme-news-card__body">
                      <div
                        className="hme-skeleton hme-news-card__sk"
                        style={{ height: 11, width: "35%" }}
                      />
                      <div
                        className="hme-skeleton hme-news-card__sk"
                        style={{ height: 15, width: "90%" }}
                      />
                      <div
                        className="hme-skeleton hme-news-card__sk"
                        style={{ height: 32 }}
                      />
                    </div>
                  </div>
                ))
              : blogPosts.map((post) => (
                  <article
                    key={post.id}
                    className="hme-news-card hme-news-card--link"
                    onClick={() =>
                      navigate("/novedades", { state: { slug: post.slug } })
                    }
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        navigate("/novedades", { state: { slug: post.slug } });
                      }
                    }}
                  >
                    <div className="hme-news-card__media">
                      <img
                        src={post.featuredImageUrl || imgUrl("/insights1.png")}
                        alt={post.featuredImageAlt || post.title}
                        width={298}
                        height={166}
                        loading="lazy"
                        draggable={false}
                      />
                    </div>
                    <div className="hme-news-card__body">
                      <div className="hme-news-card__meta">
                        {post.category && (
                          <span className="hme-news-card__cat">
                            {post.category}
                          </span>
                        )}
                        {post.publishDate && (
                          <time dateTime={post.publishDate}>
                            {formatBlogDate(post.publishDate)}
                          </time>
                        )}
                      </div>
                      <h3 className="hme-news-card__title">{post.title}</h3>
                      {post.excerpt ? (
                        <p className="hme-news-card__excerpt">{post.excerpt}</p>
                      ) : (
                        <p
                          className="hme-news-card__excerpt hme-news-card__excerpt--ph"
                          aria-hidden="true"
                        >
                          &nbsp;
                        </p>
                      )}
                      <span className="hme-news-card__cta">
                        {t("home.news.readMore")}
                        <span aria-hidden>→</span>
                      </span>
                    </div>
                  </article>
                ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
