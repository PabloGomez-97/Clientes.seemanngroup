import React, { useState, useEffect } from "react";

import { useNavigate, Link } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { format } from "date-fns";

import { es, enUS } from "date-fns/locale";

import { imgUrl } from "../../config/images";

import { getRecentPosts, getHomeSlides } from "../../services/contentful";

import type { BlogPost } from "../../services/contentful";

import "./styles/Home.css";

import TestimonialsCarousel from "./TestimonialsCarousel";

import ActivityBar from "./ActivityBar";

import WelcomeHeader from "./home/WelcomeHeader";

import HomeHeroCarousel, {

  type HeroSlide,

} from "./home/HomeHeroCarousel";

import HomeServicesGrid from "./home/HomeServicesGrid";

import HomeItinerarySection from "./home/HomeItinerarySection";

import HomeActivityPanel from "./home/HomeActivityPanel";

import HomeTrustSection from "./home/HomeTrustSection";

import EjecutivoCard from "./home/EjecutivoCard";

import { useAuth } from "../../auth/AuthContext";

import { useHomeShipments } from "../../hooks/useHomeShipments";



const FALLBACK_SLIDES = (t: (k: string) => string): HeroSlide[] => [

  {

    image: imgUrl("/insights1.png"),

    title: t("home.slide1.title"),

    subtitle: t("home.slide1.subtitle"),

    button: { text: t("home.slide1.button"), link: "/newquotes" },

  },

  {

    image: imgUrl("/insights2.png"),

    title: t("home.slide2.title"),

    subtitle: t("home.slide2.subtitle"),

    button: { text: t("home.slide2.button"), link: "/new-tracking" },

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

  const { activeCount } = useHomeShipments(activeUsername);

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  const [blogLoading, setBlogLoading] = useState(true);

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(() =>

    FALLBACK_SLIDES(t),

  );



  const dateLocale = i18n.language === "es" ? es : enUS;



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

      const mapped: HeroSlide[] = cmsSlides.map((s) => ({

        image: s.imageUrl || imgUrl("/insights1.png"),

        title: s.title,

        subtitle: s.subtitle,

        button: { text: s.buttonText, link: s.buttonLink },

      }));

      mapped.push({

        image: imgUrl("/insights3.png"),

        title: "",

        subtitle: "",

        button: { text: "", link: "/trackings" },

        dynamic: true,

      });

      setHeroSlides(mapped);

    });

  }, [i18n.language, t]);



  const formatBlogDate = (dateStr: string) => {

    try {

      return format(new Date(dateStr), "d MMM yyyy", { locale: dateLocale });

    } catch {

      return dateStr;

    }

  };



  return (

    <div className="hm-home-shell">

      <ActivityBar />

      <WelcomeHeader />



      <div className="hal-page-container">

        <div className="hal-hero-section">

          <HomeHeroCarousel

            slides={heroSlides}

            activeShipmentsCount={activeCount}

          />

        </div>



        <div className="hal-page-container-content hal-main-after-hero">

          <HomeServicesGrid />

          <HomeItinerarySection />

          <HomeActivityPanel />

          <TestimonialsCarousel />



          <div className="sectionheadline">

            <div className="hal-section-headline hal-module--border hm-news-header">

              <div>

                <h2 className="hal-h4">{t("home.news.title")}</h2>

                <h3 className="hal-h1">{t("home.news.subtitle")}</h3>

              </div>

            </div>

          </div>



          <div className="hal-teasers hal-teasers--home">

            <div className="hal-carousel--news">

              {blogLoading

                ? [1, 2, 3, 4].map((i) => (

                  <div key={i} className="hal-teaser hal-teaser--secondary">

                    <div className="hal-teaser-content hal-module--grey">

                      <div className="hm-skeleton hm-skeleton--card" />

                    </div>

                  </div>

                ))

                : blogPosts.length > 0

                  ? blogPosts.map((post) => (

                    <div

                      key={post.id}

                      className="hal-teaser hal-teaser--secondary"

                      onClick={() =>

                        navigate("/novedades", {

                          state: { slug: post.slug },

                        })

                      }

                      style={{ cursor: "pointer" }}

                      role="link"

                      tabIndex={0}

                      onKeyDown={(e) => {

                        if (e.key === "Enter" || e.key === " ") {

                          navigate("/novedades", {

                            state: { slug: post.slug },

                          });

                        }

                      }}

                    >

                      <div className="hal-teaser-content hal-module--grey">

                        <div className="hal-teaser-top">

                          <div

                            className="hal-teaser-img"

                            style={{

                              backgroundImage: post.featuredImageUrl

                                ? `url(${post.featuredImageUrl})`

                                : "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",

                            }}

                          />

                          <div className="hal-meta">

                            {post.category && (

                              <span className="hm-news-category">

                                {post.category}

                              </span>

                            )}

                            <time>{formatBlogDate(post.publishDate)}</time>

                          </div>

                        </div>

                        <div className="hal-teaser-bottom">

                          <p className="hal-teaser-text">{post.title}</p>

                          {post.excerpt && (

                            <p className="hm-news-excerpt">{post.excerpt}</p>

                          )}

                        </div>

                      </div>

                    </div>

                  ))

                  : null}

            </div>

          </div>



          <HomeTrustSection />

          <EjecutivoCard />

        </div>

      </div>

    </div>

  );

};



export default Home;

