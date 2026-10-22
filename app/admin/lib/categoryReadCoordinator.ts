export type CategoryReadOptions = {
  reusePending?: boolean;
  onError?: (reason: unknown) => void;
};

/** All category readers share one revision, including tab loads and moderation refreshes. */
export function createCategoryReadCoordinator<T>(load: () => Promise<T>, commit: (value: T) => void) {
  let revision = 0;
  let latestRequest = 0;
  let pending: { revision: number; request: number; promise: Promise<boolean> } | null = null;

  return {
    invalidate() {
      revision++;
      latestRequest++;
      pending = null;
    },
    read(options: CategoryReadOptions = {}): Promise<boolean> {
      if (options.reusePending && pending?.revision === revision) return pending.promise;
      const readRevision = revision;
      const request = ++latestRequest;
      const isCurrent = () => revision === readRevision && latestRequest === request;
      const promise = Promise.resolve().then(load).then((value) => {
        if (!isCurrent()) return false;
        commit(value);
        return true;
      }).catch((reason: unknown) => {
        if (isCurrent()) options.onError?.(reason);
        return false;
      }).finally(() => {
        if (pending?.request === request && pending.revision === readRevision) pending = null;
      });
      pending = { revision: readRevision, request, promise };
      return promise;
    },
  };
}
