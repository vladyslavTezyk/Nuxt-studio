import type { MDCRoot } from '@nuxtjs/mdc'
import type { CollectionItemBase, PageCollectionItemBase, DataCollectionItemBase } from '@nuxt/content'

// export interface DBFile extends CollectionItemBase {
//   [key: string]: any
// }

// export interface ContentDraft {
//   id: string
//   parsed: MDCRoot
//   markdown?: string
//   gitFile?: GithubFile
//   dbFile?: DBFile | null
//   deleted?: boolean
// }


// export interface ReviewFile extends ContentDraft {
//   path: string
//   markdown: string
//   original: string
// }

export interface DatabaseItem extends CollectionItemBase {
  [key: string]: any
}

export interface DatabasePageItem extends PageCollectionItemBase {
  [key: string]: any
}

export interface DatabaseDataItem extends DataCollectionItemBase {
  [key: string]: any
}

export interface GithubFile {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: string
  content?: string
  encoding?: string
  _links: {
    self: string
    git: string
    html: string
  }
}

export interface DraftFileItem {
  id: string
  /**
   * file path in content directory
   */
  path: string
  /**
   * we might not needed becasue of originalDatabaseItem
   */
  oldPath?: string
  originalDatabaseItem?: DatabaseItem
  originalGithubFile?: GithubFile

  content?: string
  document?: DatabaseItem

  status: 'deleted' | 'created' | 'updated'

}

export interface DraftFileItem {
  id: string
  /**
   * file path in content directory
   */
  path: string
  oldPath?: string
  content?: string
  url?: string

  width?: number
  height?: number
  size?: number
  mimeType?: string


  status: 'deleted' | 'created' | 'updated'
}

export interface ConfigItem {

}