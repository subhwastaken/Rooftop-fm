declare module "yt-search" {
  export interface VideoSearchResult {
    videoId: string;
    title: string;
    thumbnail: string;
    image: string;
    seconds: number;
    timestamp: string;
    views: number;
    author: {
      name: string;
      url: string;
    };
  }

  export interface VideoMetadataResult {
    videoId: string;
    title: string;
    thumbnail: string;
    image: string;
    seconds: number;
    author: {
      name: string;
    };
  }

  export interface SearchResult {
    videos: VideoSearchResult[];
  }

  function ytSearch(query: string): Promise<SearchResult>;
  function ytSearch(options: { query: string }): Promise<SearchResult>;
  function ytSearch(options: { videoId: string }): Promise<VideoMetadataResult>;

  export default ytSearch;
}

