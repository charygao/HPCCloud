import girder from './GirderClient';

export function onBusy(callback) {
    return girder.onBusy(callback);
}

export function onProgress(callback) {
    return girder.onProgress(callback);
}