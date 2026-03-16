// Type definitions for missing dependencies

// file-saver
declare module 'file-saver' {
  export function saveAs(blob: Blob, filename?: string): void;
  export function saveAs(url: string, filename?: string): void;
}

// react-swipeable
declare module 'react-swipeable' {
  import { ReactNode } from 'react';

  export interface SwipeEventData {
    event: TouchEvent | MouseEvent;
    initial: [number, number];
    first: boolean;
    deltaX: number;
    deltaY: number;
    absX: number;
    absY: number;
    velocity: number;
    vxvy: [number, number];
    dir: string;
  }

  export interface SwipeableHandlers {
    onSwiped?: (eventData: SwipeEventData) => void;
    onSwipedLeft?: (eventData: SwipeEventData) => void;
    onSwipedRight?: (eventData: SwipeEventData) => void;
    onSwipedUp?: (eventData: SwipeEventData) => void;
    onSwipedDown?: (eventData: SwipeEventData) => void;
    onSwiping?: (eventData: SwipeEventData) => void;
    onSwipeStart?: (eventData: SwipeEventData) => void;
    onTap?: (eventData: { event: TouchEvent | MouseEvent }) => void;
  }

  export interface SwipeableProps extends SwipeableHandlers {
    children?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    nodeName?: string;
    trackMouse?: boolean;
    trackTouch?: boolean;
    preventScrollOnSwipe?: boolean;
    rotationAngle?: number;
    delta?: number;
    mouseTrackingEnabled?: boolean;
    touchTrackingEnabled?: boolean;
    preventDefaultTouchmoveEvent?: boolean;
    swipeDuration?: number;
    touchEventOptions?: { passive?: boolean };
  }

  export interface SwipeableHandlersExtended extends SwipeableHandlers {
    delta?: number;
    trackMouse?: boolean;
    trackTouch?: boolean;
  }

  export function useSwipeable(handlers: SwipeableHandlersExtended): {
    ref: (element: HTMLElement | null) => void;
  };

  export const Swipeable: React.ComponentType<SwipeableProps>;
  export default Swipeable;
}

// Missing shared utility modules
declare module '../../../../shared/utils/lazy-loading' {
  export interface LazyLoadOptions {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
  }

  export function useLazyLoad(options?: LazyLoadOptions): {
    ref: React.RefObject<HTMLElement>;
    isLoaded: boolean;
  };

  export default useLazyLoad;
}

declare module '../../../../shared/utils/intersection-observer' {
  export interface IntersectionObserverOptions {
    threshold?: number | number[];
    rootMargin?: string;
    root?: Element | null;
  }

  export function useIntersectionObserver(
    elementRef: React.RefObject<Element>,
    options?: IntersectionObserverOptions
  ): boolean;

  export default useIntersectionObserver;
}

declare module '../shared/utils/pwa-metrics.js' {
  export interface PWAMetrics {
    loadTime: number;
    renderTime: number;
    interactionTime?: number;
  }

  export function trackPWAMetrics(): void;
  export function getPWAMetrics(): PWAMetrics;
  export function reportPWAMetrics(metrics: PWAMetrics): void;
}

// Service Worker global types
declare const self: ServiceWorkerGlobalScope;

interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  skipWaiting(): Promise<void>;
  clients: Clients;
  registration: ServiceWorkerRegistration;
}

// Background Fetch API
declare class BackgroundFetchEvent extends ExtendableEvent {
  readonly tag: string;
  readonly registration: any;
}

// Firebase module declarations
declare module 'firebase/app' {
  export interface FirebaseOptions {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  }

  export interface FirebaseApp {
    name: string;
    options: FirebaseOptions;
  }

  export function initializeApp(options: FirebaseOptions): FirebaseApp;
  export function getApp(name?: string): FirebaseApp;
}

declare module 'firebase/auth' {
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }

  export interface Auth {
    currentUser: User | null;
  }

  export function getAuth(app?: any): Auth;
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<any>;
  export function createUserWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<any>;
  export function signOut(auth: Auth): Promise<void>;
  export function onAuthStateChanged(auth: Auth, observer: (user: User | null) => void): () => void;
}

declare module 'firebase/firestore' {
  export type DocumentData = Record<string, any>;

  export interface DocumentReference<_T = DocumentData> {
    id: string;
    path: string;
  }

  export interface QuerySnapshot<_T = DocumentData> {
    docs: any[];
    size: number;
    empty: boolean;
  }

  export interface Firestore {}

  export function getFirestore(app?: any): Firestore;
  export function doc(firestore: Firestore, path: string, ...pathSegments: string[]): DocumentReference;
  export function collection(firestore: Firestore, path: string, ...pathSegments: string[]): any;
  export function setDoc(reference: DocumentReference, data: any, options?: any): Promise<void>;
  export function getDoc(reference: DocumentReference): Promise<any>;
  export function getDocs(query: any): Promise<QuerySnapshot>;
  export function addDoc(reference: any, data: any): Promise<DocumentReference>;
  export function updateDoc(reference: DocumentReference, data: any): Promise<void>;
  export function deleteDoc(reference: DocumentReference): Promise<void>;
  export function query(collection: any, ...queryConstraints: any[]): any;
  export function where(fieldPath: string, opStr: any, value: any): any;
  export function orderBy(fieldPath: string, directionStr?: string): any;
  export function limit(limit: number): any;
}

declare module 'firebase/analytics' {
  export interface Analytics {}

  export function getAnalytics(app?: any): Analytics;
  export function logEvent(analytics: Analytics, eventName: string, eventParams?: any): void;
}