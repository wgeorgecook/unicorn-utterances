// import { useRouter } from 'next/router'
// import ErrorPage from 'next/error'
import { getPostBySlug, getAllPosts, postsDirectory } from "utils/fs/api";
import * as React from "react";
import { DiscussionEmbed } from "disqus-react";

import markdownToHtml from "utils/markdown/markdownToHtml";
import { useMarkdownRenderer } from "utils/markdown/useMarkdownRenderer";
import { RenderedPostInfo } from "types/PostInfo";
import {
  postBySlug,
  SeriesPostInfo,
  seriesPostsPick,
  SlugPostInfo,
} from "constants/queries";
import { useRouter } from "next/router";

import { SEO } from "components/seo";
import { PostMetadata } from "../../page-components/blog-post/post-metadata";
import { PostTitleHeader } from "../../page-components/blog-post/post-title-header";
import { TableOfContents } from "components/table-of-contents";
import { BlogPostLayout } from "components/blog-post-layout";
import { MailingList } from "components/mailing-list";

import GitHubIcon from "assets/icons/github.svg";
import CommentsIcon from "assets/icons/message.svg";
import { useContext, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "constants/theme-context";
import { siteMetadata } from "constants/site-config";
import "react-medium-image-zoom/dist/styles.css";
import path from "path";
import { SeriesNav, SeriesToC } from "components/series";
import {
  getSuggestedArticles,
  OrderSuggestPosts,
} from "utils/useGetSuggestedArticles";
import { SuggestedArticles } from "../../page-components/blog-post/suggested-articles";
import { PrivacyErrorBoundary } from "components/privacy-error-boundary";
import { AnalyticsLink } from "components/analytics-link";
import { languages } from "constants/index";
import { Languages } from "types/index";
import { objectFromKeys } from "utils/objects";
import { objectMap } from "ts-util-helpers";
import { Lang } from "shiki";
import { TranslationsHeader } from "../../page-components/blog-post/translations-header";

type Props = {
  markdownHTML: string;
  slug: string;
  postsDirectory: string;
  seriesPosts: SeriesPostInfo[];
  suggestedPosts: OrderSuggestPosts;
  post: SlugPostInfo & RenderedPostInfo;
  lang: Languages;
};

const Post = ({
  post,
  markdownHTML,
  slug,
  postsDirectory,
  lang,
  seriesPosts,
  suggestedPosts,
}: Props) => {
  const router = useRouter();

  const result = useMarkdownRenderer({
    markdownHTML,
    serverPath: ["/posts", slug],
  });

  const { colorMode } = useContext(ThemeContext);

  const [disqusConfig, setDisqusConfig] = useState({
    url: `${siteMetadata.siteUrl}/posts/${slug}`,
    identifier: "/" + slug,
    title: post.title,
  });

  /**
   * Toggle the Disqus theme
   * Disqus will by default try to guess what theme to pick based on the
   * color of the background. As a result, we don't have to do much other than
   * reload it after the page theme change is finished
   */
  useEffect(() => {
    setTimeout(() => {
      if (!setDisqusConfig || !colorMode) return;
      setDisqusConfig({
        url: `${siteMetadata.siteUrl}/posts/${slug}`,
        // TODO: Fix this, this is causing comments to not apply to the correct
        //   post. This identifier should NEVER change and should ALWAYS match
        //   `slug` only
        identifier: "/" + slug,
        title: post.title,
      });
      // Must use a `useTimeout` so that this reloads AFTER the background animation
    }, 600);
  }, [colorMode, post.title, slug]);

  const GHLink = `https://github.com/${siteMetadata.repoPath}/tree/master${siteMetadata.relativeToPosts}/${slug}/index.md`;

  const langData = useMemo(() => {
    const otherLangs = post.translations
      ? (Object.keys(post.translations).filter(
          (t) => t !== lang
        ) as Languages[])
      : [];

    return {
      otherLangs,
      currentLang: lang,
    };
  }, [lang, post.translations]);

  return (
    <>
      <SEO
        title={post.title}
        description={post.description || post.excerpt}
        unicornsData={post.authors}
        publishedTime={post.published}
        editedTime={post.edited}
        keywords={post.tags}
        type="article"
        pathName={router.asPath}
        canonical={post.originalLink}
        langData={langData}
        shareImage={`/${post.slug}.twitter-preview.png`}
      />
      <article>
        <BlogPostLayout
          left={<TableOfContents headingsWithId={post.headingsWithId} />}
          right={
            <SuggestedArticles suggestedArticles={suggestedPosts} lang={lang} />
          }
          center={
            <>
              <header role="banner" className="marginZeroAutoChild">
                <PostTitleHeader post={post} />
                <PostMetadata post={post} />
              </header>
              <main className="post-body" data-testid={"post-body-div"}>
                {post.series ? (
                  <SeriesToC
                    post={post}
                    postSeries={seriesPosts}
                    collectionSlug={post.collectionSlug}
                  />
                ) : null}
                {post.translations && Object.keys(post.translations).length ? (
                  <TranslationsHeader post={post} />
                ) : null}
                {result}
                {post.series ? (
                  <SeriesNav post={post} postSeries={seriesPosts} />
                ) : null}
              </main>
            </>
          }
        />
        <footer role="contentinfo" className="post-lower-area">
          <div>
            <a
              aria-label={`Post licensed with ${post.license.displayName}`}
              href={post.license.explainLink}
              style={{ display: "table", margin: "0 auto" }}
            >
              <img
                src={post.license.footerImg}
                alt={post.license.licenceType}
              />
            </a>
          </div>
          <MailingList />
          <div className="postBottom">
            <div className="btnLike prependIcon">
              <CommentsIcon />
              <p>Comments</p>
            </div>

            <AnalyticsLink
              category="outbound"
              className="baseBtn prependIcon"
              href={GHLink}
              target="_blank"
              rel="nofollow noopener noreferrer"
            >
              <GitHubIcon />
              View this Post on GitHub
            </AnalyticsLink>

            {/*<button className="baseBtn appendIcon" type="button">*/}
            {/*  Share this Post*/}
            {/*  <ShareIcon/>*/}
            {/*</button>*/}
          </div>
          <PrivacyErrorBoundary>
            <DiscussionEmbed
              shortname={siteMetadata.disqusShortname}
              config={disqusConfig}
              key={colorMode}
            />
          </PrivacyErrorBoundary>
        </footer>
      </article>
    </>
  );
};

export default Post;

type Params = {
  params: {
    postInfo: [string];
  };
  locale: Languages;
};

const seriesPostCacheKey = {};

export async function getStaticProps({ params, locale }: Params) {
  const slugParam = params.postInfo.pop() || "";
  const lang = locale;
  const post = getPostBySlug(slugParam, lang, postBySlug);

  const isStr = (val: any): val is string => typeof val === "string";
  const slug = isStr(post.slug) ? post.slug : "";

  let seriesPosts: any[] = [];
  if (post.series && post.order) {
    const allPosts = getAllPosts(seriesPostsPick, lang, seriesPostCacheKey);

    seriesPosts = allPosts
      .filter((filterPost) => filterPost.series === post.series)
      .sort((postA, postB) => Number(postA.order) - Number(postB.order));
  }

  const suggestedPosts = getSuggestedArticles(post, lang);

  const { html: markdownHTML, headingsWithId } = await markdownToHtml(
    post.content,
    path.resolve(postsDirectory, post.slug)
  );

  return {
    props: {
      post: {
        ...post,
        content: "",
        headingsWithId,
        markdownHTML,
      },
      markdownHTML,
      slug: slug,
      postsDirectory,
      seriesPosts,
      suggestedPosts,
      lang,
    } as Props,
  };
}

export async function getStaticPaths() {
  const postsLangArr = objectMap(languages, (_, lang) => {
    return getAllPosts({ slug: true }, lang);
  });

  const paths = (Object.keys(postsLangArr) as Array<Languages>)
    .map((lang) =>
      postsLangArr[lang].map((post) => {
        return {
          params: {
            postInfo: [post.slug],
          },
          locale: lang,
        };
      })
    )
    .flat();

  return {
    paths,
    fallback: false,
  };
}
