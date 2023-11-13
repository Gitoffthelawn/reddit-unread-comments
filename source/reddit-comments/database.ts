import { databaseName } from './constants';

export interface ThreadData {
  id?: number;
  threadId: string;
  updatedAt: number;
  latestCommentId?: string;
  /** In db store as numeric timestamp. Work with Date. */
  latestCommentTimestamp?: number;
}

export interface CommentData {
  id?: number;
  threadId: string;
  sessionCreatedAt: number;
  commentId: string;
}

/** Don't use globalDb, use db = await openDatabase(). */
export let globalDb: IDBDatabase | null = null;

export const openDatabase = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);

    request.onupgradeneeded = onUpgradeNeeded;
    request.onsuccess = (event) => onSuccess(resolve, event);
    request.onerror = (event) => onError(reject, event);
  });
};

const ThreadObjectStore = 'Thread' as const;
const CommentObjectStore = 'Comment' as const;

// Create schema
const onUpgradeNeeded = (event: IDBVersionChangeEvent) => {
  const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;

  // Create Thread object store - table
  const threadObjectStore = db.createObjectStore(ThreadObjectStore, {
    keyPath: 'id',
    autoIncrement: true,
  });
  threadObjectStore.createIndex('ThreadIdIndex', 'threadId', { unique: true });
  threadObjectStore.createIndex('UpdatedAtIndex', 'updatedAt', { unique: false });
  threadObjectStore.createIndex('LatestCommentIdIndex', 'latestCommentId', {
    unique: false,
  });
  threadObjectStore.createIndex('LatestCommentTimestampIndex', 'latestCommentTimestamp', {
    unique: false,
  });

  // Create Comment object store - table
  const commentObjectStore = db.createObjectStore(CommentObjectStore, {
    keyPath: 'id',
    autoIncrement: true,
  });
  commentObjectStore.createIndex('CommentIdIndex', 'commentId', { unique: true });
  commentObjectStore.createIndex('ThreadIdIndex', 'threadId', { unique: false });
  commentObjectStore.createIndex('SessionCreatedAtIndex', 'sessionCreatedAt', {
    unique: false,
  });

  // Optionally, create a compound index for commentId and threadId as a pseudo-primary key - constraint only
  commentObjectStore.createIndex('CommentThreadIdIndex', ['commentId', 'threadId'], {
    unique: true,
  });
};

const onSuccess = (
  resolve: (value: IDBDatabase | PromiseLike<IDBDatabase>) => void,
  event: Event
) => {
  const db = (event.target as IDBRequest).result as IDBDatabase;
  globalDb = db;
  resolve(db);
};

const onError = (reject: (reason?: any) => void, event: Event) => {
  reject((event.target as IDBRequest).error);
};

export const addThread = async (
  db: IDBDatabase,
  threadData: ThreadData
): Promise<ThreadData> =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(ThreadObjectStore, 'readwrite');
    const threadObjectStore = transaction.objectStore(ThreadObjectStore);

    const addObjectRequest = threadObjectStore.add(threadData);

    addObjectRequest.onsuccess = (event) => {
      const addedThreadId = (event.target as IDBRequest).result as number;

      // Retrieve the added thread using the ID
      const getRequest = threadObjectStore.get(addedThreadId);

      getRequest.onsuccess = (event) => {
        const addedThread = (event.target as IDBRequest).result as ThreadData;
        resolve(addedThread);
      };

      getRequest.onerror = () => reject(transaction.error);
    };

    addObjectRequest.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => console.log('Thread added successfully');
  });

export const getThread = async (
  db: IDBDatabase,
  threadId: string
): Promise<ThreadData | undefined> =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(ThreadObjectStore, 'readonly');
    const threadObjectStore = transaction.objectStore(ThreadObjectStore);
    const getRequest = threadObjectStore.get(threadId);

    getRequest.onsuccess = () => resolve(getRequest.result as ThreadData);
    getRequest.onerror = () => reject(transaction.error);
  });

export const updateThread = async (
  db: IDBDatabase,
  updatedThreadData: Partial<ThreadData>
): Promise<ThreadData> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ThreadObjectStore, 'readwrite');
    const threadObjectStore = transaction.objectStore(ThreadObjectStore);

    const getRequest = threadObjectStore.get(updatedThreadData.threadId as string);

    getRequest.onsuccess = (event) => {
      const existingThread = (event.target as IDBRequest).result as ThreadData;

      if (existingThread) {
        // Merge the existing thread with the updated data
        const mergedThread = { ...existingThread, ...updatedThreadData };

        // Update the thread in the object store
        const updateRequest = threadObjectStore.put(mergedThread);

        updateRequest.onsuccess = () => {
          console.log('Thread updated successfully');
          resolve(mergedThread);
        };

        updateRequest.onerror = (event) => {
          console.error('Error updating thread:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };
      } else {
        console.error('Thread not found');
        reject('Thread not found');
      }
    };

    getRequest.onerror = (event) => {
      console.error(
        'Error fetching thread for update:',
        (event.target as IDBRequest).error
      );
      reject((event.target as IDBRequest).error);
    };
  });
};

export const addComment = async (
  db: IDBDatabase,
  commentData: CommentData
): Promise<CommentData> =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(CommentObjectStore, 'readwrite');
    const commentObjectStore = transaction.objectStore(CommentObjectStore);

    const addObjectRequest = commentObjectStore.add(commentData);

    addObjectRequest.onsuccess = (event) => {
      const addedCommentId = (event.target as IDBRequest).result as number;

      // Retrieve the added Comment using the ID
      const getRequest = commentObjectStore.get(addedCommentId);

      getRequest.onsuccess = (event) => {
        const addedComment = (event.target as IDBRequest).result as CommentData;
        resolve(addedComment);
      };

      getRequest.onerror = () => reject(transaction.error);
    };

    addObjectRequest.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => console.log('Comment added successfully');
  });

export const getComment = async (
  db: IDBDatabase,
  commentId: string
): Promise<CommentData | undefined> =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(CommentObjectStore, 'readonly');
    const commentObjectStore = transaction.objectStore(CommentObjectStore);
    const getRequest = commentObjectStore.get(commentId);

    getRequest.onsuccess = () => resolve(getRequest.result as CommentData);
    getRequest.onerror = () => reject(transaction.error);
  });

export const getAllCommentsForThread = async (
  db: IDBDatabase,
  threadId: string
): Promise<CommentData[]> =>
  new Promise<CommentData[]>((resolve, reject) => {
    const transaction = db.transaction(CommentObjectStore, 'readonly');
    const objectStore = transaction.objectStore(CommentObjectStore);
    const index = objectStore.index('ThreadIdIndex');

    const comments: CommentData[] = [];

    index.openCursor(IDBKeyRange.only(threadId)).onsuccess = (cursorEvent) => {
      const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue>).result;

      if (cursor) {
        comments.push(cursor.value);
        cursor.continue();
      } else {
        resolve(comments);
      }
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });

// Example usage:
const exampleUsage = async (db: IDBDatabase) => {
  const threadId = 'yourThreadId';
  const commentId = 'yourCommentId';

  // Adding a thread
  const newThreadId = await addThread(db, {
    threadId,
    updatedAt: new Date().getTime(),
    latestCommentId: commentId,
    latestCommentTimestamp: new Date().getTime(),
  });

  // Retrieving a thread
  const retrievedThread = await getThread(db, threadId);
  console.log('Retrieved Thread:', retrievedThread);

  // Adding a comment
  const newCommentId = await addComment(db, {
    commentId,
    threadId,
    sessionCreatedAt: new Date().getTime(),
  });

  // Retrieving a comment
  const retrievedComment = await getComment(db, commentId);
  console.log('Retrieved Comment:', retrievedComment);
};

// 1 699 867 623 577 // 2066
