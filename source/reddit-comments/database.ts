import { currentSessionCreatedAt, databaseName } from './constants';

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

/** Returns database or throws exception. */
export const openDatabase = async (): Promise<IDBDatabase> => {
  const openDatabaseLocal = async (): Promise<IDBDatabase> => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);

      request.onupgradeneeded = onUpgradeNeeded;
      request.onsuccess = (event) => onSuccess(resolve, event);
      request.onerror = (event) => onError(reject, event);
    });
  };

  try {
    const db = await openDatabaseLocal();
    return db;
  } catch (error) {
    // Handle the error or rethrow if needed
    console.error('Error opening database:', error);
    throw error;
  }
};

const Thread = {
  ThreadObjectStore: 'Thread',
  ThreadIdIndex: 'ThreadIdIndex',
  UpdatedAtIndex: 'UpdatedAtIndex',
  LatestCommentIdIndex: 'LatestCommentIdIndex',
  LatestCommentTimestampIndex: 'LatestCommentTimestampIndex',
} as const;

const Comment = {
  CommentObjectStore: 'Comment',
  CommentIdIndex: 'CommentIdIndex',
  ThreadIdIndex: 'ThreadIdIndex',
  SessionCreatedAtIndex: 'SessionCreatedAtIndex',
  CommentIdThreadIdIndex: 'CommentIdThreadIdIndex',
} as const;

// Create schema
const onUpgradeNeeded = (event: IDBVersionChangeEvent) => {
  const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;

  // Create Thread object store - table
  const threadObjectStore = db.createObjectStore(Thread.ThreadObjectStore, {
    keyPath: 'id',
    autoIncrement: true,
  });
  threadObjectStore.createIndex(Thread.ThreadIdIndex, 'threadId', { unique: true });
  threadObjectStore.createIndex(Thread.UpdatedAtIndex, 'updatedAt', { unique: false });
  threadObjectStore.createIndex(Thread.LatestCommentIdIndex, 'latestCommentId', {
    unique: false,
  });
  threadObjectStore.createIndex(
    Thread.LatestCommentTimestampIndex,
    'latestCommentTimestamp',
    {
      unique: false,
    }
  );

  // Create Comment object store - table
  const commentObjectStore = db.createObjectStore(Comment.CommentObjectStore, {
    keyPath: 'id',
    autoIncrement: true,
  });
  commentObjectStore.createIndex(Comment.CommentIdIndex, 'commentId', { unique: true });
  commentObjectStore.createIndex(Comment.ThreadIdIndex, 'threadId', { unique: false });
  commentObjectStore.createIndex(Comment.SessionCreatedAtIndex, 'sessionCreatedAt', {
    unique: false,
  });

  // Optionally, create a compound index for commentId and threadId as a pseudo-primary key - constraint only
  commentObjectStore.createIndex(
    Comment.CommentIdThreadIdIndex,
    ['commentId', 'threadId'],
    {
      unique: true,
    }
  );
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
    const transaction = db.transaction(Thread.ThreadObjectStore, 'readwrite');
    const threadObjectStore = transaction.objectStore(Thread.ThreadObjectStore);

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
    transaction.oncomplete = () =>
      console.log(`Thread with threadId: ${threadData.threadId} added successfully.`);
  });

export const getThread = async (
  db: IDBDatabase,
  threadId: string
): Promise<ThreadData | undefined> =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(Thread.ThreadObjectStore, 'readonly');
    const threadObjectStore = transaction.objectStore(Thread.ThreadObjectStore);
    const getRequest = threadObjectStore.index(Thread.ThreadIdIndex).get(threadId);

    getRequest.onsuccess = () => resolve(getRequest.result as ThreadData);
    getRequest.onerror = () => reject(transaction.error);
  });

export const updateThread = async (
  db: IDBDatabase,
  updatedThreadData: Partial<ThreadData>
): Promise<ThreadData> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(Thread.ThreadObjectStore, 'readwrite');
    const threadObjectStore = transaction.objectStore(Thread.ThreadObjectStore);

    const getRequest = threadObjectStore
      .index(Thread.ThreadIdIndex)
      .get(updatedThreadData.threadId as string);

    getRequest.onsuccess = (event) => {
      const existingThread = (event.target as IDBRequest).result as ThreadData;

      if (existingThread) {
        // Merge the existing thread with the updated data
        const mergedThread = { ...existingThread, ...updatedThreadData };

        // Update the thread in the object store
        const updateRequest = threadObjectStore.put(mergedThread);

        updateRequest.onsuccess = () => {
          console.log(
            `Thread with threadId: ${updatedThreadData.threadId} updated successfully.`
          );
          resolve(mergedThread);
        };

        updateRequest.onerror = (event) => {
          console.error('Error updating thread:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };
      } else {
        const message = `Thread with threadId: ${updatedThreadData.threadId} not found.`;
        console.error(message);
        reject(message);
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
    const transaction = db.transaction(Comment.CommentObjectStore, 'readwrite');
    const commentObjectStore = transaction.objectStore(Comment.CommentObjectStore);

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
    transaction.oncomplete = () =>
      console.log(
        `Comment with commentId: ${commentData.id}, threadId: ${commentData.threadId} added successfully.`
      );
  });

export const getComment = async (
  db: IDBDatabase,
  commentId: string
): Promise<CommentData | undefined> =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(Comment.CommentObjectStore, 'readonly');
    const commentObjectStore = transaction.objectStore(Comment.CommentObjectStore);
    const getRequest = commentObjectStore.index(Comment.CommentIdIndex).get(commentId);

    getRequest.onsuccess = () => resolve(getRequest.result as CommentData);
    getRequest.onerror = () => reject(transaction.error);
  });

export const getAllCommentsForThread = async (
  db: IDBDatabase,
  threadId: string
): Promise<CommentData[]> =>
  new Promise<CommentData[]>((resolve, reject) => {
    const transaction = db.transaction(Comment.CommentObjectStore, 'readonly');
    const objectStore = transaction.objectStore(Comment.CommentObjectStore);
    const index = objectStore.index(Thread.ThreadIdIndex);

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

/** Returns all comments for thread except comments from current session. */
export const getCommentsForThreadWithoutCurrentSession = async (
  db: IDBDatabase,
  threadId: string
): Promise<CommentData[]> =>
  (await getAllCommentsForThread(db, threadId)).filter(
    (comment) => comment.sessionCreatedAt !== currentSessionCreatedAt
  );

export const getCommentsForThreadForCurrentSession = async (
  db: IDBDatabase,
  threadId: string
): Promise<CommentData[]> =>
  (await getAllCommentsForThread(db, threadId)).filter(
    (comment) => comment.sessionCreatedAt === currentSessionCreatedAt
  );

export const updateComment = async (
  db: IDBDatabase,
  updatedCommentData: Partial<CommentData>
): Promise<CommentData> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(Comment.CommentObjectStore, 'readwrite');
    const commentObjectStore = transaction.objectStore(Comment.CommentObjectStore);

    const getRequest = commentObjectStore
      .index(Comment.CommentIdIndex)
      .get(updatedCommentData.commentId as string);

    getRequest.onsuccess = (event) => {
      const existingComment = (event.target as IDBRequest).result as CommentData;

      if (existingComment) {
        // Merge the existing comment with the updated data
        const mergedComment = { ...existingComment, ...updatedCommentData };

        // Update the comment in the object store
        const updateRequest = commentObjectStore.put(mergedComment);

        updateRequest.onsuccess = () => {
          console.log(
            `Comment with commentId: ${updatedCommentData.commentId} updated successfully.`
          );
          resolve(mergedComment);
        };

        updateRequest.onerror = (event) => {
          console.error('Error updating comment:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };
      } else {
        const message = `Comment with commentId: ${updatedCommentData.commentId} not found.`;
        console.error(message);
        reject(message);
      }
    };

    getRequest.onerror = (event) => {
      console.error(
        'Error fetching comment for update:',
        (event.target as IDBRequest).error
      );
      reject((event.target as IDBRequest).error);
    };
  });
};

export const updateCommentsSessionCreatedAtForThread = (
  db: IDBDatabase,
  threadId: string,
  sessionCreatedAt: number
): Promise<CommentData[]> =>
  new Promise<CommentData[]>((resolve, reject) => {
    getAllCommentsForThread(db, threadId)
      .then((comments) => {
        const commentsToUpdate = comments.filter(
          (comment) => comment.sessionCreatedAt === currentSessionCreatedAt
        );

        if (!(commentsToUpdate.length > 0)) return resolve([]);

        const updatePromises = commentsToUpdate.map((comment) =>
          updateComment(db, {
            ...comment,
            sessionCreatedAt,
          })
        );

        Promise.all(updatePromises)
          .then((updatedComments) => resolve(updatedComments))
          .catch((error) => reject(error));
      })
      .catch((error) => reject(error));
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
