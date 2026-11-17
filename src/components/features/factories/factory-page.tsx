import { useMemo, type ReactNode } from "react";
import { ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import AutomationsIcon from "#/icons/automations.svg?react";
import { I18nKey } from "#/i18n/declaration";
import { AutomationsDashboard } from "#/components/features/automations/dashboard/automations-dashboard";
import { AutomationCardSkeleton } from "#/components/features/automations/automation-card-skeleton";
import { ErrorState } from "#/components/features/automations/error-state";
import {
  ManifestSubpageLayout,
  type SubPageNavItem,
} from "#/components/features/manifest/manifest-subpage-layout";
import { BackNavButton } from "#/components/shared/buttons/back-nav-button";
import { WorklogPanel } from "#/components/features/factories/worklog/worklog-panel";
import {
  FACTORIES_PATH,
  factoryPath,
  factoryWorklogsPath,
} from "#/constants/factories";
import { useFactory, useFactoriesSupported } from "#/hooks/query/use-factories";
import { useWorklogsSupported } from "#/hooks/query/use-worklogs";
import { getErrorStatus } from "#/hooks/query/use-settings";
import { hasAutomationInterface } from "#/manifests/automation-interface";

/** Factories are served by the automation service, so they need its interface. */
export function requireAutomationInterface() {
  if (!hasAutomationInterface()) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }
  return null;
}

export type FactorySection = "automations" | "worklogs";

/**
 * A factory's page: the sub-page navigation around one section. The routes
 * render this rather than each other, because React Router wraps a route
 * module's default export and drops any props passed to it.
 */
export function FactoryPage({
  section = "automations",
}: {
  section?: FactorySection;
}) {
  const { t } = useTranslation("openhands");
  const { factoryId = "" } = useParams();
  const { isLoading: isCapabilitiesLoading, isSupported } =
    useFactoriesSupported();
  const {
    data: factory,
    isLoading: isFactoryLoading,
    isError,
    error,
    refetch,
  } = useFactory(factoryId, { enabled: isSupported });

  const { isLoading: isWorklogsLoading, isSupported: isWorklogsSupported } =
    useWorklogsSupported();

  const navItems = useMemo<SubPageNavItem[]>(
    () => [
      {
        to: factoryPath(factoryId),
        label: t(I18nKey.FACTORIES$AUTOMATIONS_NAV),
        Icon: AutomationsIcon,
        testId: "factory-navigation-automations",
      },
      ...(isWorklogsSupported
        ? [
            {
              to: factoryWorklogsPath(factoryId),
              label: t(I18nKey.WORKLOGS$NAV_LABEL),
              Icon: ScrollText,
              testId: "factory-navigation-worklogs",
            },
          ]
        : []),
    ],
    [factoryId, isWorklogsSupported, t],
  );

  const backLink = (
    <BackNavButton to={FACTORIES_PATH} testId="factory-back-link">
      {t(I18nKey.FACTORIES$BACK)}
    </BackNavButton>
  );

  const renderPlain = (content: ReactNode) => (
    <div className="min-h-full">
      <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
        {backLink}
        {content}
      </div>
    </div>
  );

  if (
    isCapabilitiesLoading ||
    (isSupported && isFactoryLoading) ||
    (section === "worklogs" && isWorklogsLoading)
  ) {
    return renderPlain(<AutomationCardSkeleton />);
  }
  if (!isSupported) {
    return renderPlain(
      <p data-testid="factories-unsupported" className="text-sm text-muted">
        {t(I18nKey.FACTORIES$UNSUPPORTED)}
      </p>,
    );
  }
  if (isError && getErrorStatus(error) === 404) {
    return renderPlain(
      <p data-testid="factory-not-found" className="text-sm text-muted">
        {t(I18nKey.FACTORIES$NOT_FOUND)}
      </p>,
    );
  }
  if (isError || !factory) {
    return renderPlain(
      <ErrorState
        title={t(I18nKey.FACTORIES$LOAD_ERROR)}
        onRetry={() => void refetch()}
      />,
    );
  }

  const renderSection = () => {
    if (section === "worklogs") {
      return isWorklogsSupported ? (
        <WorklogPanel factoryId={factory.id} />
      ) : (
        <p data-testid="worklogs-unsupported" className="text-sm text-muted">
          {t(I18nKey.WORKLOGS$UNSUPPORTED)}
        </p>
      );
    }
    return <AutomationsDashboard factoryId={factory.id} embedded />;
  };

  return (
    <ManifestSubpageLayout
      heading={factory.name}
      navTestIdBase="factory-navbar"
      items={navItems}
    >
      {backLink}
      {renderSection()}
    </ManifestSubpageLayout>
  );
}
