import React, { createContext, useCallback, useContext, useState } from "react";

interface VideoRefreshContextType {
  shouldRefresh: boolean;
  triggerVideoRefresh: () => void;
  resetRefreshTrigger: () => void;
}

const VideoRefreshContext = createContext<VideoRefreshContextType | undefined>(
  undefined
);

export function VideoRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shouldRefresh, setShouldRefresh] = useState(false);

  const triggerVideoRefresh = useCallback(() => {
    setShouldRefresh(true);
  }, []);

  const resetRefreshTrigger = useCallback(() => {
    setShouldRefresh(false);
  }, []);

  return (
    <VideoRefreshContext.Provider
      value={{ shouldRefresh, triggerVideoRefresh, resetRefreshTrigger }}
    >
      {children}
    </VideoRefreshContext.Provider>
  );
}

export function useVideoRefresh() {
  const context = useContext(VideoRefreshContext);
  if (context === undefined) {
    throw new Error(
      "useVideoRefresh must be used within a VideoRefreshProvider"
    );
  }
  return context;
}
