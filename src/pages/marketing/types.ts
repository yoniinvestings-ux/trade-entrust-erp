export type CampaignPlatform = 'Google' | 'Facebook' | 'LinkedIn' | 'Instagram' | 'Email' | 'Offline';
export type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft';

export interface Campaign {
    id: string;
    name: string;
    platform: CampaignPlatform;
    status: CampaignStatus;
    budget: number;
    spent: number;
    startDate: Date;
    endDate?: Date;
    leadsGenerated: number;
    costPerLead: number;
    clicks?: number;
    impressions?: number;
}
