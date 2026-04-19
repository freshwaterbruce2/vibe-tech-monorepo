import type { ServiceContainer } from './service-container';
import type { WsHub } from './ws-hub';
import type { FileEvent, ProcessChunk, ProcessHandle, ClaudeStreamEvent } from '../shared/types';

export function wireStreams(c: ServiceContainer, hub: WsHub): () => void {
  const onEvents = (events: FileEvent[]) => hub.broadcast('cc.watcher.events', events);
  const onReady = () => hub.broadcast('cc.watcher.ready', null);
  const onWatcherErr = (err: Error) => hub.broadcast('cc.watcher.error', { message: err.message });
  const onChunk = (chunk: ProcessChunk) => hub.broadcast('cc.process.chunk', chunk);
  const onExit = (handle: ProcessHandle) => hub.broadcast('cc.process.exit', handle);
  const onClaudeStream = (evt: ClaudeStreamEvent) => hub.broadcast('cc.claude.stream', evt);

  c.watcher.on('events', onEvents);
  c.watcher.on('ready', onReady);
  c.watcher.on('error', onWatcherErr);
  c.runner.on('chunk', onChunk);
  c.runner.on('exit', onExit);
  c.claude.on('stream', onClaudeStream);

  return () => {
    c.watcher.off('events', onEvents);
    c.watcher.off('ready', onReady);
    c.watcher.off('error', onWatcherErr);
    c.runner.off('chunk', onChunk);
    c.runner.off('exit', onExit);
    c.claude.off('stream', onClaudeStream);
  };
}
