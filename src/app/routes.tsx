import { Suspense, lazy } from "react";
import { Redirect, Route, Switch } from "wouter";
import { BIO_PUBLIC_PATH } from "@shared/bio";

// Eager load the landing page for instant first paint; every other route splits out.
import { HomePage } from "@/pages/HomePage";

// Code-split all other pages dynamically for fast initial bundle
const ExplorePage = lazy(() => import("@/pages/ExplorePage").then((m) => ({ default: m.ExplorePage })));
const ConciergePage = lazy(() => import("@/pages/ConciergePage").then((m) => ({ default: m.ConciergePage })));
const CirclePage = lazy(() => import("@/pages/CirclePage").then((m) => ({ default: m.CirclePage })));
const CompanionPage = lazy(() => import("@/pages/CompanionPage").then((m) => ({ default: m.CompanionPage })));
const SolutionsPage = lazy(() => import("@/pages/SolutionsPage").then((m) => ({ default: m.SolutionsPage })));
const SolutionDetailPage = lazy(() =>
  import("@/pages/SolutionDetailPage").then((m) => ({ default: m.SolutionDetailPage })),
);
const GuidePage = lazy(() => import("@/pages/GuidePage").then((m) => ({ default: m.GuidePage })));
const TourPage = lazy(() => import("@/pages/TourPage").then((m) => ({ default: m.TourPage })));
const ScanPage = lazy(() => import("@/pages/ScanPage").then((m) => ({ default: m.ScanPage })));
const WavePage = lazy(() => import("@/pages/WavePage").then((m) => ({ default: m.WavePage })));
const PlacePage = lazy(() => import("@/pages/PlacePage").then((m) => ({ default: m.PlacePage })));
const EventPage = lazy(() => import("@/pages/EventPage").then((m) => ({ default: m.EventPage })));
const CalendarPage = lazy(() => import("@/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const StallPage = lazy(() => import("@/pages/StallPage").then((m) => ({ default: m.StallPage })));
const OrganiserEventPage = lazy(() =>
  import("@/pages/OrganiserEventPage").then((m) => ({ default: m.OrganiserEventPage })),
);

const MePage = lazy(() => import("@/pages/MePage").then((m) => ({ default: m.MePage })));
const MyTicketsPage = lazy(() => import("@/pages/MyTicketsPage").then((m) => ({ default: m.MyTicketsPage })));
const InboxPage = lazy(() => import("@/pages/InboxPage").then((m) => ({ default: m.InboxPage })));
const ZooPage = lazy(() => import("@/pages/ZooPage").then((m) => ({ default: m.ZooPage })));
const MemoryWallPage = lazy(() => import("@/pages/MemoryWallPage").then((m) => ({ default: m.MemoryWallPage })));
const PeoplePage = lazy(() => import("@/pages/PeoplePage").then((m) => ({ default: m.PeoplePage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const MarkerPage = lazy(() => import("@/pages/MarkerPage").then((m) => ({ default: m.MarkerPage })));
const StayPage = lazy(() => import("@/pages/StayPage").then((m) => ({ default: m.StayPage })));
const DemoHotelPage = lazy(() => import("@/pages/DemoHotelPage").then((m) => ({ default: m.DemoHotelPage })));
const HostPage = lazy(() => import("@/pages/HostPage").then((m) => ({ default: m.HostPage })));
const HostPulsePage = lazy(() => import("@/pages/HostPulsePage").then((m) => ({ default: m.HostPulsePage })));
const PulseHubPage = lazy(() => import("@/pages/PulseHubPage").then((m) => ({ default: m.PulseHubPage })));
const PulsePublicPage = lazy(() => import("@/pages/PulsePublicPage").then((m) => ({ default: m.PulsePublicPage })));
const StartPage = lazy(() => import("@/pages/StartPage").then((m) => ({ default: m.StartPage })));
const AuthActionPage = lazy(() => import("@/pages/AuthActionPage").then((m) => ({ default: m.AuthActionPage })));
const PartnersPage = lazy(() => import("@/pages/PartnersPage").then((m) => ({ default: m.PartnersPage })));
const CreatePage = lazy(() => import("@/pages/CreatePage").then((m) => ({ default: m.CreatePage })));
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
const SearchPage = lazy(() => import("@/pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const SearchAnalyticsPage = lazy(() =>
  import("@/pages/SearchAnalyticsPage").then((m) => ({ default: m.SearchAnalyticsPage })),
);
const CampusPage = lazy(() => import("@/pages/CampusPage").then((m) => ({ default: m.CampusPage })));
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const GiveawaysPage = lazy(() => import("@/pages/GiveawaysPage").then((m) => ({ default: m.GiveawaysPage })));
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
const MyGiveawaysPage = lazy(() => import("@/pages/MyGiveawaysPage").then((m) => ({ default: m.MyGiveawaysPage })));
const NotificationsAdminPage = lazy(() =>
  import("@/pages/NotificationsAdminPage").then((m) => ({ default: m.NotificationsAdminPage })),
);
const GetAirPalPage = lazy(() => import("@/pages/GetAirPalPage").then((m) => ({ default: m.GetAirPalPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const AboutPage = lazy(() => import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("@/pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("@/pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const CookiesPage = lazy(() => import("@/pages/CookiesPage").then((m) => ({ default: m.CookiesPage })));
const ClubPage = lazy(() => import("@/pages/ClubPage").then((m) => ({ default: m.ClubPage })));
const ClubListPage = lazy(() => import("@/pages/ClubListPage").then((m) => ({ default: m.ClubListPage })));
const MatePage = lazy(() => import("@/pages/MatePage").then((m) => ({ default: m.MatePage })));
const MateRequestPage = lazy(() => import("@/pages/MateRequestPage").then((m) => ({ default: m.MateRequestPage })));
const StudioPage = lazy(() => import("@/pages/StudioPage").then((m) => ({ default: m.StudioPage })));
const MarketingPage = lazy(() => import("@/pages/MarketingPage").then((m) => ({ default: m.MarketingPage })));
const BusinessCampaignsPage = lazy(() =>
  import("@/pages/BusinessCampaignsPage").then((m) => ({ default: m.BusinessCampaignsPage })),
);
const ExperiencesPage = lazy(() => import("@/pages/ExperiencesPage").then((m) => ({ default: m.ExperiencesPage })));
const FashionPage = lazy(() => import("@/pages/FashionPage").then((m) => ({ default: m.FashionPage })));
const FestivalPage = lazy(() => import("@/pages/FestivalPage").then((m) => ({ default: m.FestivalPage })));
const FestivalCreatePage = lazy(() =>
  import("@/pages/FestivalCreatePage").then((m) => ({ default: m.FestivalCreatePage })),
);
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
        <Route path="/search/analytics" component={SearchAnalyticsPage} />
        <Route path="/admin/search-analytics">
          <Redirect to="/search/analytics" />
        </Route>
        <Route path="/search" component={SearchPage} />
        <Route path="/mate" component={MatePage} />
        <Route path="/mate/request" component={MateRequestPage} />
        <Route path="/explore" component={ExplorePage} />
        <Route path="/discover">
          <Redirect to="/explore" />
        </Route>
        <Route path="/discovery">
          <Redirect to="/explore" />
        </Route>
        <Route path="/solutions/:id" component={SolutionDetailPage} />
        <Route path="/solutions" component={SolutionsPage} />
        <Route path="/guide" component={GuidePage} />
        <Route path="/tour/:id" component={TourPage} />
        <Route path="/scan" component={ScanPage} />
        <Route path="/w/:code" component={WavePage} />
        <Route path="/concierge" component={ConciergePage} />
        <Route path="/stay">
          <Redirect to="/concierge" />
        </Route>
        <Route path="/companion" component={CompanionPage} />
        <Route path="/g/:id" component={StayPage} />
        <Route path="/stay/:id" component={StayPage} />
        <Route path="/DemoHotel" component={DemoHotelPage} />
        <Route path="/demohotel">
          <Redirect to="/DemoHotel" />
        </Route>
        <Route path="/q/:city/:handle" component={MarkerPage} />
        <Route path="/q/:a" component={MarkerPage} />
        <Route path="/q">
          <Redirect to="/q/syd-rocks-argyle" />
        </Route>
        <Route path="/p/:id" component={PlacePage} />
        <Route path="/e/:eventId/s/:stallId" component={StallPage} />
        <Route path="/e/:id" component={EventPage} />
        <Route path="/f/new" component={FestivalCreatePage} />
        <Route path="/f/:slug" component={FestivalPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/events">
          <Redirect to="/calendar" />
        </Route>
        <Route path="/plans">
          <Redirect to="/plan" />
        </Route>
        <Route path="/plan/new" component={PlanCreatePage} />
        <Route path="/plan/:id/edit" component={PlanEditPage} />
        <Route path="/plan/:id" component={PlanDetailPage} />
        <Route path="/plan" component={PlanHubPage} />
        <Route path="/invite/:code" component={PlanDetailPage} />
        <Route path="/event/new">
          <Redirect to="/event" />
        </Route>
        <Route path="/event" component={OrganiserEventPage} />
        <Route path="/me/zoo" component={ZooPage} />
        <Route path="/me/memories" component={MemoryWallPage} />
        <Route path="/me/people" component={PeoplePage} />
        <Route path="/inbox" component={InboxPage} />
        <Route path="/chat" component={InboxPage} />
        <Route path="/messages" component={InboxPage} />
        <Route path="/me/inbox" component={InboxPage} />
        <Route path="/me/tickets" component={MyTicketsPage} />
        <Route path="/circle" component={CirclePage} />
        <Route path="/me" component={MePage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/c/:id" component={CampusPage} />
        <Route path="/campus">
          <Redirect to="/c/harbour-college" />
        </Route>
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
        <Route path="/fashion" component={FashionPage} />
        <Route path="/club/list" component={ClubListPage} />
        <Route path="/club" component={ClubPage} />
        <Route path="/business/onboard" component={BusinessOnboardPage} />
        <Route path="/business/setup" component={BusinessShowcasePage} />
        <Route path="/business/campaigns" component={BusinessCampaignsPage} />
        <Route path="/business/helpdesk" component={HelpDeskPage} />
        <Route path="/host/helpdesk" component={HelpDeskPage} />
        <Route path="/helpdesk" component={HelpDeskPage} />
        <Route path="/business" component={BusinessPage} />
        <Route path="/experiences" component={ExperiencesPage} />
        <Route path="/studio" component={StudioPage} />
        <Route path="/marketing" component={MarketingPage} />
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
        <Route path="/create" component={CreatePage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/promotions" component={PromotionsAdminPage} />
        <Route path="/admin/promotions/:id" component={PromotionAdminDetailPage} />
        <Route path="/business/promotions/new" component={BusinessPromotionNewPage} />
        <Route path="/business/promotions/:id" component={BusinessPromotionDetailPage} />
        <Route path="/business/promotions" component={BusinessPromotionsPage} />
        <Route path="/me/giveaways" component={MyGiveawaysPage} />
        <Route path="/admin/notifications" component={NotificationsAdminPage} />
        <Route path="/giveaways/:id">
          <PromotionDetailPage kind="giveaway" />
        </Route>
        <Route path="/giveaways" component={GiveawaysPage} />
        <Route path="/promotions/:id">
          <PromotionDetailPage kind="promotion" />
        </Route>
        <Route path="/promotions" component={PromotionsPage} />
        <Route path="/deals/:id">
          <PromotionDetailPage kind="promotion" />
        </Route>
        <Route path="/deals" component={PromotionsPage} />
        <Route path="/offers" component={PromotionsPage} />
        <Route path="/getAirPalApp" component={GetAirPalPage} />
        <Route path="/getAirPal">
          <Redirect to="/getAirPalApp" />
        </Route>
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
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
