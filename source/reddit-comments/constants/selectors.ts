// selectors, easier to select children than parents

/*------------------ url regex -----------------*/

export const redditThreadUrlRegex = /https?:\/\/www\.?reddit\.com\/r\/\w+\/comments\/.+/;
export const redditUrlRegex = /https?:\/\/www\.?reddit\.com.*/;

/*------------------ comment -----------------*/

export const commentIdAttribute = 'thingid';
export const commentSelector = 'shreddit-comment[thingid^="t1_"]';
export const commentIdRegexValidate = /^t1_[a-z0-9]+$/;

// comment
export const getCommentSelectorFromId = (commentId: string) =>
  `shreddit-comment[thingid^="${commentId}"]`;

// timestamp
export const getTimestampSelectorFromId = (commentId: string) => {
  const targetCommentSelector = getCommentSelectorFromId(commentId);

  // ! HERE was broken selector
  // select direct child element first to exclude nested comments
  const timestampSelector = `${targetCommentSelector} > details > summary time[datetime]`;
  return timestampSelector;
};

// content - for visibility and highlight
export const getContentSelectorFromId = (commentId: string) => {
  const targetCommentSelector = getCommentSelectorFromId(commentId);

  // ! HERE was broken selector
  // id="t1_p2f9i0y-comment-rtjson-content"
  const contentSelector = `${targetCommentSelector} #${commentId}-comment-rtjson-content`; // used in styles.scss too
  return contentSelector;
};

/*----------------- thread ----------------*/

export const threadPostSelector = 'shreddit-post[id^="t3_"]';
export const threadPostIdRegexReplace = /^t3_/; // Only to get url id from element.id
export const threadPostIdRegexValidate = /^t3_[a-z0-9]+$/;

/*-------------- zero comments -------------*/

export const threadWithZeroCommentsSelector =
  'comment-forest-empty-state[post-id^="t3_"]';

export const brokenCommentsThreadSelector = '#main-content > shreddit-forbidden';

/*----------------- header ----------------*/

export const pageHeaderSelector = 'reddit-header-large';

/*------------- sort dropdown ------------*/

// shadow host 1
export const sortMenuShadowHostSelector = 'shreddit-sort-dropdown';
// inside shadow dom
export const currentlySelectedItemSelector = '#comment-sort-button > span > span';
export const sortMenuClickSelector = '#comment-sort-button';

// dropdown item new
export const sortByNewMenuItemSelector =
  'div[slot="dropdown-items"] data[value="NEW"] span:first-of-type';
