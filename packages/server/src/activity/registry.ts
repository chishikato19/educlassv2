import type { ActivityDefinition } from '@educlass/core';
import type { ActivityMeta } from '@educlass/protocol';
import { QuickPollActivity } from '@educlass/activity-quick-poll';
import { QuizLiveActivity } from '@educlass/activity-quiz-live';
import { ExamActivity } from '@educlass/activity-exam';
import { SwissDuelActivity } from '@educlass/activity-swiss-duel';
import { AssignmentHubActivity } from '@educlass/activity-assignment-hub';
import { PdfPresenterActivity } from '@educlass/activity-pdf-presenter';
import { ObjectCameraActivity } from '@educlass/activity-object-camera';
import { TerritoryWarActivity } from '@educlass/activity-territory-war';
import { ProjectGradingActivity } from '@educlass/activity-project-grading';
import { ArcadeDuelActivity } from '@educlass/activity-arcade-duel';
import { InteractiveBoardActivity } from '@educlass/activity-interactive-board';
import { CircuitRaceActivity } from '@educlass/activity-circuit-race';

export class ActivityRegistry {
  private activities = new Map<string, ActivityDefinition>();

  /**
   * Đăng ký một Activity plugin mới vào hệ thống
   */
  register(activity: ActivityDefinition): void {
    if (this.activities.has(activity.id)) {
      throw new Error(`Activity with id "${activity.id}" is already registered.`);
    }
    this.activities.set(activity.id, activity);
  }

  /**
   * Lấy Activity theo ID
   */
  get(id: string): ActivityDefinition | undefined {
    return this.activities.get(id);
  }

  /**
   * Kiểm tra Activity có tồn tại trong hệ thống không
   */
  has(id: string): boolean {
    return this.activities.has(id);
  }

  /**
   * Danh sách metadata của tất cả Activity có sẵn
   */
  list(): ActivityMeta[] {
    return Array.from(this.activities.values()).map(act => ({
      id: act.id,
      name: act.name,
      version: act.version,
      icon: act.icon,
      description: act.description,
      capabilities: act.capabilities ?? [],
      rewardTriggers: act.rewardTriggers,
    }));
  }
}

/**
 * Registry mặc định của hệ thống với các Activity chuẩn được nạp sẵn
 */
export const defaultActivityRegistry = new ActivityRegistry();

// Đăng ký Activity chuẩn bằng 1 dòng import theo hợp đồng PLAN.md mục 4
defaultActivityRegistry.register(QuickPollActivity as ActivityDefinition);
defaultActivityRegistry.register(QuizLiveActivity as ActivityDefinition);
defaultActivityRegistry.register(ExamActivity as ActivityDefinition);
defaultActivityRegistry.register(SwissDuelActivity as ActivityDefinition);
defaultActivityRegistry.register(AssignmentHubActivity as ActivityDefinition);
defaultActivityRegistry.register(PdfPresenterActivity as ActivityDefinition);
defaultActivityRegistry.register(ObjectCameraActivity as ActivityDefinition);
defaultActivityRegistry.register(TerritoryWarActivity as ActivityDefinition);
defaultActivityRegistry.register(ProjectGradingActivity as ActivityDefinition);
defaultActivityRegistry.register(ArcadeDuelActivity as ActivityDefinition);
defaultActivityRegistry.register(InteractiveBoardActivity as ActivityDefinition);
defaultActivityRegistry.register(CircuitRaceActivity as ActivityDefinition);
