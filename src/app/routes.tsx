import { Suspense, lazy } from "react";
import { Redirect, Route, Switch } from "wouter";
import { BIO_PUBLIC_PATH } from "@shared/bio";

// Eager load the landing page for instant first paint; every other route splits out.
import { HomePage } from "@/pages/HomePage";

// Phase 6 (Subtraction): only V1 routes ship. Deleted surfaces (Mate/strangers,
// duplicate directories, P3/P4 verticals, vanity) redirect to their V1 owner or 404.
const NowPage = lazy(() => import("@/pages/NowPage").then((m) => ({ default: m.NowPage })));
const ConciergePage = lazy(() => import("@/pages/ConciergePage").then((m) => ({ default: m.ConciergePage })));
const GuidePage = lazy(() => import("@/pages/GuidePage").then((m) => ({ default: m.GuidePage })));
const TourPage = lazy(() => import("@/pages/TourPage").then((m) => ({ default: m.TourPage })));
const ScanPage = lazy(() => import("@/pages/ScanPage").then((m) => ({ default: m.ScanPage })));
const WavePage = lazy(() => import("@/pages/WavePage").then((m) => ({ default: m.WavePage })));
const PlacePage = lazy(() => import("@/pages/PlacePage").then((m) => ({ default: m.PlacePage })));
const EventPage = lazy(() => import("@/pages/EventPage").then((m) => ({ default: m.EventPage })));
const TicketPage = lazy(() => import("@/pages/TicketPage").then((m) => ({ default: m.TicketPage })));
const CalendarPage = lazy(() => import("@/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const EventsPage = lazy(() => import("@/pages/EventsPage").then((m) => ({ default: m.EventsPage })));
const StallPage = lazy(() => import("@/pages/StallPage").then((m) => ({ default: m.StallPage })));
const GuestlistPage = lazy(() => import("@/pages/GuestlistPage").then((m) => ({ default: m.GuestlistPage })));
const OrganiserEventPage = lazy(() =>
  import("@/pages/OrganiserEventPage").then((m) => ({ default: m.OrganiserEventPage })),
);

const MePage = lazy(() => import("@/pages/MePage").then((m) => ({ default: m.MePage })));
const MyTicketsPage = lazy(() => import("@/pages/MyTicketsPage").then((m) => ({ default: m.MyTicketsPage })));
const InboxPage = lazy(() => import("@/pages/InboxPage").then((m) => ({ default: m.InboxPage })));
const MemoryWallPage = lazy(() => import("@/pages/MemoryWallPage").then((m) => ({ default: m.MemoryWallPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const MarkerPage = lazy(() => import("@/pages/MarkerPage").then((m) => ({ default: m.MarkerPage })));
const StayPage = lazy(() => import("@/pages/StayPage").then((m) => ({ default: m.StayPage })));
const StayListPage = lazy(() => import("@/pages/StayListPage").then((m) => ({ default: m.StayListPage })));
const StayProfilePage = lazy(() => import("@/pages/StayProfilePage").then((m) => ({ default: m.StayProfilePage })));
const HostPage = lazy(() => import("@/pages/HostPage").then((m) => ({ default: m.HostPage })));
const HostPulsePage = lazy(() => import("@/pages/HostPulsePage").then((m) => ({ default: m.HostPulsePage })));
const PulseHubPage = lazy(() => import("@/pages/PulseHubPage").then((m) => ({ default: m.PulseHubPage })));
const PulsePublicPage = lazy(() => import("@/pages/PulsePublicPage").then((m) => ({ default: m.PulsePublicPage })));
const StartPage = lazy(() => import("@/pages/StartPage").then((m) => ({ default: m.StartPage })));
const AuthActionPage = lazy(() => import("@/pages/AuthActionPage").then((m) => ({ default: m.AuthActionPage })));
const PartnersPage = lazy(() => import("@/pages/PartnersPage").then((m) => ({ default: m.PartnersPage })));
const PartnerPage = lazy(() => import("@/pages/PartnerPage").then((m) => ({ default: m.PartnerPage })));
const JoinPage = lazy(() => import("@/pages/JoinPage").then((m) => ({ default: m.JoinPage })));
const FoundersPage = lazy(() => import("@/pages/FoundersPage").then((m) => ({ default: m.FoundersPage })));
const BusinessPage = lazy(() => import("@/pages/BusinessPage").then((m) => ({ default: m.BusinessPage })));
const BusinessOnboardPage = lazy(() =>
  import("@/pages/BusinessOnboardPage").then((m) => ({ default: m.BusinessOnboardPage })),
);
const BusinessShowcasePage = lazy(() =>
  import("@/pages/BusinessShowcasePage").then((m) => ({ default: m.BusinessShowcasePage })),
);
const BioPublicPage = lazy(() => import("@/pages/BioPublicPage").then((m) => ({ default: m.BioPublicPage })));
const BioSetupPage = lazy(() => import("@/pages/BioSetupPage").then((m) => ({ default: m.BioSetupPage })));
const BioEditPage = lazy(() => import("@/pages/BioEditPage").then((m) => ({ default: m.BioEditPage })));
const BioRecoverPage = lazy(() => import("@/pages/BioRecoverPage").then((m) => ({ default: m.BioRecoverPage })));
const SearchAnalyticsPage = lazy(() =>
  import("@/pages/SearchAnalyticsPage").then((m) => ({ default: m.SearchAnalyticsPage })),
);
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const PromotionsPage = lazy(() => import("@/pages/PromotionsPage").then((m) => ({ default: m.PromotionsPage })));
const PromotionDetailPage = lazy(() =>
  import("@/pages/PromotionDetailPage").then((m) => ({ default: m.PromotionDetailPage })),
);
const PromotionsAdminPage = lazy(() =>
  import("@/pages/PromotionsAdminPage").then((m) => ({ default: m.PromotionsAdminPage })),
);
const PromotionAdminDetailPage = lazy(() =>
  import("@/pages/PromotionAdminDetailPage").then((m) => ({ default: m.PromotionAdminDetailPage })),
);
const BusinessPromotionsPage = lazy(() =>
  import("@/pages/BusinessPromotionsPage").then((m) => ({ default: m.BusinessPromotionsPage })),
);
const BusinessPromotionNewPage = lazy(() =>
  import("@/pages/BusinessPromotionNewPage").then((m) => ({ default: m.BusinessPromotionNewPage })),
);
const BusinessPromotionDetailPage = lazy(() =>
  import("@/pages/BusinessPromotionDetailPage").then((m) => ({ default: m.BusinessPromotionDetailPage })),
);
const NotificationsAdminPage = lazy(() =>
  import("@/pages/NotificationsAdminPage").then((m) => ({ default: m.NotificationsAdminPage })),
);
const GetAirPalPage = lazy(() => import("@/pages/GetAirPalPage").then((m) => ({ default: m.GetAirPalPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const TrustPage = lazy(() => import("@/pages/TrustPage").then((m) => ({ default: m.TrustPage })));
const AlternativePage = lazy(() => import("@/pages/AlternativePage").then((m) => ({ default: m.AlternativePage })));
const AboutPage = lazy(() => import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("@/pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const HelpPage = lazy(() => import("@/pages/HelpPage").then((m) => ({ default: m.HelpPage })));
const AssistPage = lazy(() => import("@/pages/AssistPage").then((m) => ({ default: m.AssistPage })));
const UnsubscribePage = lazy(() => import("@/pages/UnsubscribePage").then((m) => ({ default: m.UnsubscribePage })));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("@/pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const CookiesPage = lazy(() => import("@/pages/CookiesPage").then((m) => ({ default: m.CookiesPage })));
const PlanHubPage = lazy(() => import("@/pages/PlanHubPage").then((m) => ({ default: m.PlanHubPage })));
const PlanCreatePage = lazy(() => import("@/pages/PlanCreatePage").then((m) => ({ default: m.PlanCreatePage })));
const PlanDetailPage = lazy(() => import("@/pages/PlanDetailPage").then((m) => ({ default: m.PlanDetailPage })));
const PlanEditPage = lazy(() => import("@/pages/PlanEditPage").then((m) => ({ default: m.PlanEditPage })));
const HelpDeskPage = lazy(() => import("@/pages/HelpDeskPage").then((m) => ({ default: m.HelpDeskPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <p className="text-sm text-mute">Loading</p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/now" component={NowPage} />
        {/* One composer: every legacy discovery front door lands on /now. */}
        <Route path="/explore">
          <Redirect to="/now" />
        </Route>
        <Route path="/discover">
          <Redirect to="/now" />
        </Route>
        <Route path="/discovery">
          <Redirect to="/now" />
        </Route>
        <Route path="/search">
          <Redirect to="/now" />
        </Route>
        <Route path="/admin/search-analytics" component={SearchAnalyticsPage} />
        <Route path="/search/analytics">
          <Redirect to="/admin/search-analytics" />
        </Route>
        <Route path="/guide" component={GuidePage} />
        <Route path="/tour/:id" component={TourPage} />
        <Route path="/scan" component={ScanPage} />
        <Route path="/w/:code" component={WavePage} />
        <Route path="/concierge" component={ConciergePage} />
        <Route path="/stay" component={StayListPage} />
        <Route path="/g/:id" component={StayPage} />
        <Route path="/stay/@:handle" component={StayProfilePage} />
        <Route path="/stay/:id" component={StayPage} />
        <Route path="/q/:city/:handle" component={MarkerPage} />
        <Route path="/q/:a" component={MarkerPage} />
        <Route path="/q">
          <Redirect to="/q/syd-rocks-argyle" />
        </Route>
        <Route path="/p/:id" component={PlacePage} />
        <Route path="/e/:eventId/s/:stallId" component={StallPage} />
        <Route path="/e/:id/guests" component={GuestlistPage} />
        <Route path="/e/:id" component={EventPage} />
        <Route path="/ticket/:id" component={TicketPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/events" component={EventsPage} />
        <Route path="/plans">
          <Redirect to="/plan" />
        </Route>
        <Route path="/plan/new" component={PlanCreatePage} />
        <Route path="/plan/:id/edit" component={PlanEditPage} />
        <Route path="/plan/:id/guests" component={GuestlistPage} />
        <Route path="/plan/:id" component={PlanDetailPage} />
        <Route path="/plan" component={PlanHubPage} />
        <Route path="/invite/:code" component={PlanDetailPage} />
        <Route path="/event/new">
          <Redirect to="/event" />
        </Route>
        <Route path="/event" component={OrganiserEventPage} />
        <Route path="/me/memories" component={MemoryWallPage} />
        <Route path="/me/inbox" component={InboxPage} />
        <Route path="/inbox">
          <Redirect to="/me/inbox" />
        </Route>
        <Route path="/chat">
          <Redirect to="/me/inbox" />
        </Route>
        <Route path="/messages">
          <Redirect to="/me/inbox" />
        </Route>
        <Route path="/me/tickets" component={MyTicketsPage} />
        <Route path="/me" component={MePage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/host/pulse" component={HostPulsePage} />
        <Route path="/host" component={HostPage} />
        <Route path="/pulse" component={PulseHubPage} />
        <Route path="/pulse/:publicToken" component={PulsePublicPage} />
        <Route path="/start" component={StartPage} />
        <Route path="/reset">
          <Redirect to="/start?tab=reset" />
        </Route>
        <Route path="/auth/action" component={AuthActionPage} />
        <Route path="/join" component={JoinPage} />
        <Route path="/founders" component={FoundersPage} />
        <Route path="/business/onboard" component={BusinessOnboardPage} />
        <Route path="/business/setup" component={BusinessShowcasePage} />
        <Route path="/business/helpdesk">
          <Redirect to="/helpdesk" />
        </Route>
        <Route path="/host/helpdesk">
          <Redirect to="/helpdesk" />
        </Route>
        <Route path="/helpdesk" component={HelpDeskPage} />
        <Route path="/business" component={BusinessPage} />
        <Route path="/bio/setup" component={BioSetupPage} />
        <Route path="/bio/edit" component={BioEditPage} />
        <Route path="/bio/recover" component={BioRecoverPage} />
        <Route path="/auth">
          <Redirect to="/start?tab=signin" />
        </Route>
        <Route path="/signin">
          <Redirect to="/start?tab=signin" />
        </Route>
        <Route path="/partners" component={PartnersPage} />
        <Route path="/partner" component={PartnerPage} />
        <Route path="/listings">
          <Redirect to="/partners" />
        </Route>
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/promotions" component={PromotionsAdminPage} />
        <Route path="/admin/promotions/:id" component={PromotionAdminDetailPage} />
        <Route path="/business/promotions/new" component={BusinessPromotionNewPage} />
        <Route path="/business/promotions/:id" component={BusinessPromotionDetailPage} />
        <Route path="/business/promotions" component={BusinessPromotionsPage} />
        <Route path="/admin/notifications" component={NotificationsAdminPage} />
        {/* One deals surface: legacy deal homes land on /deals. */}
        <Route path="/deals/:id">
          <PromotionDetailPage kind="promotion" />
        </Route>
        <Route path="/deals" component={PromotionsPage} />
        <Route path="/offers">
          <Redirect to="/deals" />
        </Route>
        <Route path="/promotions">
          <Redirect to="/deals" />
        </Route>
        <Route path="/promotions/:id">{(p) => <Redirect to={`/deals/${p.id}`} />}</Route>
        <Route path="/giveaways">
          <Redirect to="/deals" />
        </Route>
        <Route path="/giveaways/:id">{(p) => <Redirect to={`/deals/${p.id}`} />}</Route>
        <Route path="/birthday-freebies">
          <Redirect to="/deals" />
        </Route>
        <Route path="/birthday-freebies/:region">
          <Redirect to="/deals" />
        </Route>
        <Route path="/getAirPalApp" component={GetAirPalPage} />
        <Route path="/getAirPal">
          <Redirect to="/getAirPalApp" />
        </Route>
        <Route path="/about" component={AboutPage} />
        <Route path="/trust" component={TrustPage} />
        <Route path="/alternatives/:slug" component={AlternativePage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/help" component={HelpPage} />
        <Route path="/assist" component={AssistPage} />
        <Route path="/unsubscribe" component={UnsubscribePage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/cookies" component={CookiesPage} />
        <Route path="/legal">
          <Redirect to="/privacy" />
        </Route>
        <Route path="/os">
          <Redirect to="/concierge" />
        </Route>
        <Route path={BIO_PUBLIC_PATH} component={BioPublicPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </Suspense>
  );
}
