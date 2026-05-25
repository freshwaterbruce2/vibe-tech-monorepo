import { EntitlementsService as SharedEntitlementsService, PlanFeatureMatrix } from '@vibetech/entitlements';
import { authService } from './AuthService';

// Define the feature matrix for vibe-code-studio
export const VIBE_STUDIO_FEATURE_MATRIX: PlanFeatureMatrix = {
  free: [
    'editor.basic',
    'editor.theme',
    'ai.assistant.limited' // limited chat messages
  ],
  pro: [
    'editor.basic',
    'editor.theme',
    'ai.assistant.unlimited',
    'ai.autocomplete',
    'rules.custom',
    'agent.multi'
  ]
};

class LocalEntitlementsService {
  private sharedService: SharedEntitlementsService;

  constructor() {
    this.sharedService = new SharedEntitlementsService(VIBE_STUDIO_FEATURE_MATRIX);
  }

  getCurrentPlan(): string {
    const user = authService.getCurrentUser();
    return user ? user.plan : 'free';
  }

  hasFeature(featureKey: string): boolean {
    const plan = this.getCurrentPlan();
    return this.sharedService.hasFeature(plan, featureKey, {
      environment: (process.env.NODE_ENV === 'production' ? 'prod' : 'dev') as 'prod' | 'dev' | 'staging',
      userId: authService.getCurrentUser()?.id,
    });
  }

  evaluateFeature(featureKey: string) {
    const plan = this.getCurrentPlan();
    return this.sharedService.evaluateFeature(plan, featureKey, {
      environment: (process.env.NODE_ENV === 'production' ? 'prod' : 'dev') as 'prod' | 'dev' | 'staging',
      userId: authService.getCurrentUser()?.id,
    });
  }

  getFeaturesForCurrentPlan(): string[] {
    const plan = this.getCurrentPlan();
    return this.sharedService.getFeaturesForPlan(plan);
  }
}

export const entitlementsService = new LocalEntitlementsService();
