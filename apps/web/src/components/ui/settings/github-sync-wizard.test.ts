import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { GitHubSyncStatus } from '@mind-hub/shared';
import GitHubSyncWizard from './GitHubSyncWizard.vue';
import MindTopbar from '../../shell/MindTopbar.vue';
import { useMindStore } from '../../../stores/mind-store.js';

describe('@mind-hub/web — GitHubSyncWizard & Topbar Sync Status (Refs #91)', () => {
  it('guides the user through the 3-step Plug & Play wizard and emits test-connection and configure', async () => {
    const wrapper = mount(GitHubSyncWizard);

    expect(wrapper.find('[data-testid="wizard-step-1"]').exists()).toBe(true);
    const next1 = wrapper.find('[data-testid="github-step1-next-btn"]');
    expect(next1.attributes('disabled')).toBeDefined();

    await wrapper.find('[data-testid="github-token-input"]').setValue('ghp_secret_test_123');
    expect(next1.attributes('disabled')).toBeUndefined();
    await next1.trigger('click');

    // Step 2: Repo, branch, test connection
    expect(wrapper.find('[data-testid="wizard-step-2"]').exists()).toBe(true);
    await wrapper.find('[data-testid="github-repo-input"]').setValue('luizGDpulz/mind-vault');
    await wrapper.find('[data-testid="github-branch-input"]').setValue('main');
    await wrapper.find('[data-testid="github-test-btn"]').trigger('click');

    expect(wrapper.emitted('test-connection')?.[0]).toEqual([
      {
        repository: 'luizGDpulz/mind-vault',
        branch: 'main',
        token: 'ghp_secret_test_123',
      },
    ]);

    await wrapper.find('[data-testid="github-step2-next-btn"]').trigger('click');

    // Step 3: Strategy & Configure
    expect(wrapper.find('[data-testid="wizard-step-3"]').exists()).toBe(true);
    await wrapper.find('[data-testid="strategy-merge"] input').setValue(true);
    await wrapper.find('[data-testid="github-connect-btn"]').trigger('click');

    expect(wrapper.emitted('configure')?.[0]).toEqual([
      {
        repository: 'luizGDpulz/mind-vault',
        branch: 'main',
        token: 'ghp_secret_test_123',
        strategy: 'merge',
        autoSyncEnabled: true,
        debounceSeconds: 120,
      },
    ]);
  });

  it('renders connected repository dashboard, history, and emits sync-now/disconnect', async () => {
    const connectedStatus: GitHubSyncStatus = {
      state: 'connected',
      configured: true,
      repository: 'luizGDpulz/mind-vault',
      branch: 'main',
      autoSyncEnabled: true,
      debounceSeconds: 120,
      pendingChangesCount: 2,
      lastSyncAt: '2026-11-13T18:30:00.000Z',
      lastCommitSha: 'abcdef1234567890',
      lastError: null,
      history: [
        {
          id: 'hist-1',
          timestamp: '2026-11-13T18:30:00.000Z',
          direction: 'push',
          commitSha: 'abcdef1234567890',
          filesChanged: 3,
          summary: 'Enviadas 3 alterações OKF',
          status: 'success',
        },
      ],
    };

    const wrapper = mount(GitHubSyncWizard, {
      props: {
        status: connectedStatus,
      },
    });

    expect(wrapper.find('[data-testid="github-connected-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="github-connected-repo"]').text()).toBe(
      'luizGDpulz/mind-vault',
    );
    expect(wrapper.find('[data-testid="github-pending-count"]').text()).toContain('2 pendente(s)');
    expect(wrapper.find('[data-testid="github-sync-history"]').text()).toContain(
      'Enviadas 3 alterações OKF',
    );

    await wrapper.find('[data-testid="github-sync-now-btn"]').trigger('click');
    expect(wrapper.emitted('sync-now')?.length).toBe(1);

    await wrapper.find('[data-testid="github-disconnect-btn"]').trigger('click');
    expect(wrapper.emitted('disconnect')?.length).toBe(1);
  });

  it('MindTopbar reflects subtle GitHub sync status and emits open-sync-settings', async () => {
    setActivePinia(createPinia());
    const store = useMindStore();

    const wrapper = mount(MindTopbar, {
      props: { leftDrawerOpen: true },
      global: {
        stubs: {
          'q-header': { template: '<header><slot /></header>' },
          'q-toolbar': { template: '<div><slot /></div>' },
          'q-space': { template: '<div />' },
          MindIconButton: { template: '<button />' },
          MindActionMenu: true,
          MindPageIcon: true,
        },
      },
    });

    const pill = wrapper.find('[data-testid="topbar-github-sync-pill"]');
    expect(pill.exists()).toBe(true);
    expect(pill.text()).toContain('Conectar Git');

    store.gitHubSyncStatus = {
      ...store.gitHubSyncStatus,
      configured: true,
      state: 'connected',
      repository: 'luizGDpulz/mind-vault',
      pendingChangesCount: 0,
    };
    await wrapper.vm.$nextTick();
    expect(pill.text()).toContain('GitHub OK');

    await pill.trigger('click');
    expect(wrapper.emitted('open-sync-settings')?.length).toBe(1);
  });
});
