import SwiftUI

// MARK: - Design System Tokens (8pt Grid & Semantic Colors)
enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

enum Radius {
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let card: CGFloat = 28
    static let pill: CGFloat = 999
}

enum AirPalColors {
    static let brand = Color(red: 24/255, green: 5/255, blue: 219/255) // #1805db
    static let brandMuted = Color(red: 24/255, green: 5/255, blue: 219/255).opacity(0.12)
    static let gold = Color(red: 217/255, green: 119/255, blue: 6/255)
    static let goldMuted = Color(red: 217/255, green: 119/255, blue: 6/255).opacity(0.14)
}

// MARK: - Native Liquid Glass Material Modifier
struct LiquidGlassModifier: ViewModifier {
    var cornerRadius: CGFloat = Radius.card
    var isInteractive: Bool = false
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .stroke(
                                LinearGradient(
                                    colors: [
                                        Color.white.opacity(colorScheme == .dark ? 0.35 : 0.75),
                                        Color.white.opacity(colorScheme == .dark ? 0.08 : 0.25)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
                    .shadow(
                        color: Color.black.opacity(colorScheme == .dark ? 0.35 : 0.08),
                        radius: 16,
                        x: 0,
                        y: 8
                    )
            )
    }
}

extension View {
    func liquidGlass(cornerRadius: CGFloat = Radius.card) -> some View {
        modifier(LiquidGlassModifier(cornerRadius: cornerRadius))
    }
    
    func touchTarget(minSize: CGFloat = 44) -> some View {
        frame(minWidth: minSize, minHeight: minSize)
    }
}

// MARK: - Domain Models
enum AvailabilityStatus: String, CaseIterable, Identifiable {
    case available
    case busy
    case dnd
    case brb
    case offline

    var id: String { rawValue }

    var label: String {
        switch self {
        case .available: return "Available"
        case .busy: return "Busy"
        case .dnd: return "Do not disturb"
        case .brb: return "Be right back"
        case .offline: return "Offline"
        }
    }

    var color: Color {
        switch self {
        case .available: return .green
        case .busy: return .red
        case .dnd: return .purple
        case .brb: return .orange
        case .offline: return .gray
        }
    }
}

struct BioDeal: Identifiable {
    let id: String
    let badge: String
    let title: String
    let detail: String
    let code: String
}

struct BioProfile {
    let handle: String
    let name: String
    let shortWhy: String
    let aboutStory: String?
    let city: String
    let category: String
    let websiteUrl: String?
    let whatsappPhone: String?
    let phone: String?
    let status: AvailabilityStatus
    let ownerUid: String?
    let avatarUrl: String?
    let coverUrl: String?
    let deals: [BioDeal]
}

// MARK: - View State
enum ViewState<T> {
    case loading
    case loaded(T)
    case empty(message: String)
    case error(message: String)
}

// MARK: - Shimmer Skeleton Effect for Loading & AI Inference
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1.0

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.0),
                            Color.white.opacity(0.35),
                            Color.white.opacity(0.0)
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 1.5)
                    .offset(x: phase * geo.size.width * 1.5)
                }
            )
            .mask(content)
            .onAppear {
                withAnimation(
                    .linear(duration: 1.5)
                    .repeatForever(autoreverses: false)
                ) {
                    phase = 1.0
                }
            }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}

// MARK: - Main Profile View
struct BioProfileView: View {
    @State private var state: ViewState<BioProfile> = .loading
    @State private var isFollowing = false
    @State private var isLiked = false
    @State private var showQRModal = false
    @State private var copiedInviteCode = false
    @State private var aiPrompt = ""
    @State private var isAIThinking = false
    @State private var aiStreamedResponse: String? = nil

    var body: some View {
        NavigationStack {
            Group {
                switch state {
                case .loading:
                    LoadingSkeletonView()
                case .loaded(let profile):
                    LoadedContentView(
                        profile: profile,
                        isFollowing: $isFollowing,
                        isLiked: $isLiked,
                        showQRModal: $showQRModal,
                        copiedInviteCode: $copiedInviteCode,
                        aiPrompt: $aiPrompt,
                        isAIThinking: $isAIThinking,
                        aiStreamedResponse: $aiStreamedResponse
                    )
                case .empty(let msg):
                    EmptyStateView(message: msg) {
                        loadProfile()
                    }
                case .error(let err):
                    ErrorStateView(errorMessage: err) {
                        loadProfile()
                    }
                }
            }
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showQRModal = true
                    } label: {
                        Image(systemName: "qrcode")
                            .touchTarget()
                    }
                }
            }
            .sheet(isPresented: $showQRModal) {
                if case .loaded(let profile) = state {
                    QRCodeSheetView(profile: profile)
                        .presentationDetents([.medium])
                        .presentationDragIndicator(.visible)
                }
            }
        }
        .onAppear {
            loadProfile()
        }
    }

    private var navigationTitle: String {
        if case .loaded(let profile) = state {
            return "@\(profile.handle)"
        }
        return "AirPal Bio"
    }

    private func loadProfile() {
        state = .loading
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            // Demo loaded profile
            let demo = BioProfile(
                handle: "harbour-rocks",
                name: "Harbour Rocks Hotel",
                shortWhy: "Historic sandstone boutique retreat nestled in Sydney's historic The Rocks precinct.",
                aboutStory: "Built in 1887 on the grounds of Sydney's first hospital, Harbour Rocks Hotel is an intimate 59-room haven blending heritage architecture with modern harborside elegance.",
                city: "Sydney",
                category: "Heritage Hotel",
                websiteUrl: "https://harbourrocks.com.au",
                whatsappPhone: "+61412345678",
                phone: "+61282209999",
                status: .available,
                ownerUid: "owner-123",
                avatarUrl: nil,
                coverUrl: nil,
                deals: [
                    BioDeal(
                        id: "d1",
                        badge: "VIP Welcome",
                        title: "Complimentary Arrival Cocktails",
                        detail: "Show your pass at Eric's Bar to redeem two curated cocktails.",
                        code: "ROCKS27"
                    )
                ]
            )
            state = .loaded(demo)
        }
    }
}

// MARK: - Loaded Content View
private struct LoadedContentView: View {
    let profile: BioProfile
    @Binding var isFollowing: Bool
    @Binding var isLiked: Bool
    @Binding var showQRModal: Bool
    @Binding var copiedInviteCode: Bool
    @Binding var aiPrompt: String
    @Binding var isAIThinking: Bool
    @Binding var aiStreamedResponse: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                // Hero Header Card
                HeroHeaderView(profile: profile)
                
                // Social Engagement Deck: [Follow] [Like] [www] [QR]
                SocialDeckView(
                    profile: profile,
                    isFollowing: $isFollowing,
                    isLiked: $isLiked,
                    showQRModal: $showQRModal
                )

                // 1-Tap Quick Action Deck: [Chat], [WhatsApp], [Call]
                QuickActionDeckView(profile: profile)

                // About Story
                if let story = profile.aboutStory, !story.isEmpty {
                    AboutStoryCard(story: story)
                }

                // AI Concierge Assistant (Account for token stream latencies)
                AIAssistantCard(
                    profile: profile,
                    prompt: $aiPrompt,
                    isThinking: $isAIThinking,
                    streamedResponse: $aiStreamedResponse
                )

                // Offers / Deals
                if !profile.deals.isEmpty {
                    DealsSectionView(deals: profile.deals)
                }

                // Relocated Invite Code Card (At the bottom before footer)
                if profile.ownerUid != nil {
                    InviteCodeCard(
                        profile: profile,
                        copiedCode: $copiedInviteCode
                    )
                }

                // Brand Footer
                ProfileFooterView(handle: profile.handle)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
        }
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Hero Header
private struct HeroHeaderView: View {
    let profile: BioProfile

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Concentric Squircle Avatar + Status Badge
            HStack(spacing: Spacing.md) {
                ZStack(alignment: .bottomTrailing) {
                    RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                        .fill(AirPalColors.brandMuted)
                        .frame(width: 80, height: 80)
                        .overlay(
                            Text(String(profile.name.prefix(1)))
                                .font(.system(size: 34, weight: .bold, design: .rounded))
                                .foregroundColor(AirPalColors.brand)
                        )
                    
                    Circle()
                        .fill(profile.status.color)
                        .frame(width: 20, height: 20)
                        .overlay(Circle().stroke(Color(.systemBackground), lineWidth: 3))
                        .offset(x: 4, y: 4)
                }

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack(spacing: Spacing.xs) {
                        Text(profile.name)
                            .font(.system(.title3, design: .default, weight: .bold))
                            .foregroundColor(.primary)

                        Image(systemName: "checkmark.seal.fill")
                            .foregroundColor(AirPalColors.brand)
                            .imageScale(.small)
                    }

                    Text("@\(profile.handle) · \(profile.category)")
                        .font(.system(.subheadline, design: .default))
                        .foregroundColor(.secondary)

                    HStack(spacing: Spacing.xs) {
                        Circle()
                            .fill(profile.status.color)
                            .frame(width: 8, height: 8)
                        Text(profile.status.label)
                            .font(.system(.caption, design: .default, weight: .semibold))
                            .foregroundColor(profile.status.color)
                    }
                }
            }

            // Short Why description
            Text(profile.shortWhy)
                .font(.system(.body, design: .default))
                .foregroundColor(.primary)
                .lineSpacing(4)
                .padding(.top, Spacing.xs)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
    }
}

// MARK: - Social Engagement Deck: [Follow] [Like] [www] [QR]
private struct SocialDeckView: View {
    let profile: BioProfile
    @Binding var isFollowing: Bool
    @Binding var isLiked: Bool
    @Binding var showQRModal: Bool

    var body: some View {
        HStack(spacing: Spacing.sm) {
            // Follow Button
            Button {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                isFollowing.toggle()
            } label: {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: isFollowing ? "person.crop.circle.badge.checkmark" : "person.badge.plus")
                    Text(isFollowing ? "Following" : "Follow")
                }
                .font(.system(.footnote, weight: .semibold))
                .foregroundColor(isFollowing ? AirPalColors.brand : .white)
                .frame(maxWidth: .infinity)
                .touchTarget()
                .background(isFollowing ? AirPalColors.brandMuted : AirPalColors.brand)
                .clipShape(Capsule())
            }

            // Like Button
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                isLiked.toggle()
            } label: {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: isLiked ? "heart.fill" : "heart")
                        .foregroundColor(isLiked ? .red : .primary)
                    Text(isLiked ? "Liked" : "Like")
                }
                .font(.system(.footnote, weight: .semibold))
                .foregroundColor(.primary)
                .frame(maxWidth: .infinity)
                .touchTarget()
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Color(.separator), lineWidth: 0.5))
            }

            // Clean "www" website button without globe icon
            if let website = profile.websiteUrl, let url = URL(string: website) {
                Link(destination: url) {
                    Text("www")
                        .font(.system(.footnote, weight: .bold))
                        .foregroundColor(.primary)
                        .padding(.horizontal, Spacing.md)
                        .touchTarget()
                        .background(Color(.secondarySystemGroupedBackground))
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(Color(.separator), lineWidth: 0.5))
                }
            }

            // QR Code button
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                showQRModal = true
            } label: {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "qrcode")
                        .foregroundColor(AirPalColors.gold)
                    Text("QR")
                }
                .font(.system(.footnote, weight: .bold))
                .foregroundColor(.primary)
                .padding(.horizontal, Spacing.md)
                .touchTarget()
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Color(.separator), lineWidth: 0.5))
            }
        }
    }
}

// MARK: - 1-Tap Quick Action Deck: [Chat], [WhatsApp], [Call]
private struct QuickActionDeckView: View {
    let profile: BioProfile

    var body: some View {
        HStack(spacing: Spacing.sm) {
            // Chat
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            } label: {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "message.fill")
                    Text("Chat")
                }
                .font(.system(.footnote, weight: .bold))
                .foregroundColor(AirPalColors.brand)
                .frame(maxWidth: .infinity)
                .touchTarget()
                .background(AirPalColors.brandMuted)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
            }

            // WhatsApp
            if let wa = profile.whatsappPhone, let url = URL(string: "https://wa.me/\(wa)") {
                Link(destination: url) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "bubble.left.and.bubble.right.fill")
                        Text("WhatsApp")
                    }
                    .font(.system(.footnote, weight: .semibold))
                    .foregroundColor(.green)
                    .frame(maxWidth: .infinity)
                    .touchTarget()
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Color(.separator), lineWidth: 0.5))
                }
            }

            // Call
            if let phone = profile.phone, let url = URL(string: "tel:\(phone)") {
                Link(destination: url) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "phone.fill")
                        Text("Call")
                    }
                    .font(.system(.footnote, weight: .semibold))
                    .foregroundColor(AirPalColors.gold)
                    .frame(maxWidth: .infinity)
                    .touchTarget()
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Color(.separator), lineWidth: 0.5))
                }
            }
        }
    }
}

// MARK: - About Story Card
private struct AboutStoryCard: View {
    let story: String

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("ABOUT STORY")
                .font(.system(.caption2, weight: .bold))
                .foregroundColor(AirPalColors.gold)
                .tracking(1.2)

            Text(story)
                .font(.system(.subheadline, design: .default))
                .foregroundColor(.secondary)
                .lineSpacing(4)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
    }
}

// MARK: - AI Concierge Assistant (Accounts for token streaming latency)
private struct AIAssistantCard: View {
    let profile: BioProfile
    @Binding var prompt: String
    @Binding var isThinking: Bool
    @Binding var streamedResponse: String?

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Label("AirPal AI Assistant", systemImage: "sparkles")
                    .font(.system(.caption, weight: .bold))
                    .foregroundColor(AirPalColors.brand)
                Spacer()
                if isThinking {
                    Text("Thinking…")
                        .font(.system(.caption2, weight: .medium))
                        .foregroundColor(.secondary)
                }
            }

            HStack(spacing: Spacing.sm) {
                TextField("Ask anything about \(profile.name)…", text: $prompt)
                    .font(.system(.subheadline))
                    .padding(.horizontal, Spacing.sm)
                    .touchTarget()

                Button {
                    guard !prompt.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    triggerAIInference()
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundColor(AirPalColors.brand)
                        .touchTarget()
                }
                .disabled(isThinking)
            }
            .padding(.horizontal, Spacing.sm)
            .background(Color(.systemBackground))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color(.separator), lineWidth: 0.5))

            // Inline streaming response with shimmer during inference
            if isThinking {
                HStack(spacing: Spacing.xs) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 16)
                        .shimmer()
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 80, height: 16)
                        .shimmer()
                }
                .padding(.vertical, Spacing.xs)
            } else if let response = streamedResponse {
                Text(response)
                    .font(.system(.footnote))
                    .foregroundColor(.primary)
                    .padding(.vertical, Spacing.xs)
                    .transition(.opacity)
            }
        }
        .padding(Spacing.md)
        .liquidGlass()
    }

    private func triggerAIInference() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        isThinking = true
        streamedResponse = nil
        let sampleAnswer = "\(profile.name) offers historic boutique accommodations in The Rocks with personalized dining at Eric's Bar and full event concierge."
        
        // Simulating streaming token latency
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            withAnimation(.easeOut(duration: 0.3)) {
                self.isThinking = false
                self.streamedResponse = sampleAnswer
            }
        }
    }
}

// MARK: - Deals Section
private struct DealsSectionView: View {
    let deals: [BioDeal]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("SPECIAL OFFERS & DEALS")
                .font(.system(.caption2, weight: .bold))
                .foregroundColor(AirPalColors.gold)
                .tracking(1.2)

            ForEach(deals) { deal in
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack {
                        Text(deal.badge)
                            .font(.system(.caption2, weight: .bold))
                            .foregroundColor(AirPalColors.gold)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 2)
                            .background(AirPalColors.goldMuted)
                            .clipShape(Capsule())
                        Spacer()
                        Text(deal.code)
                            .font(.system(.caption, design: .monospaced, weight: .bold))
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 2)
                            .background(Color(.systemBackground))
                            .clipShape(Capsule())
                    }

                    Text(deal.title)
                        .font(.system(.subheadline, weight: .bold))
                        .foregroundColor(.primary)

                    Text(deal.detail)
                        .font(.system(.caption))
                        .foregroundColor(.secondary)
                }
                .padding(Spacing.md)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
            }
        }
    }
}

// MARK: - Relocated Bottom Invite Code Card
private struct InviteCodeCard: View {
    let profile: BioProfile
    @Binding var copiedCode: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: "ticket.fill")
                    .foregroundColor(AirPalColors.gold)
                Text("YOUR INVITE CODE")
                    .font(.system(.caption2, weight: .bold))
                    .foregroundColor(AirPalColors.gold)
                    .tracking(1.2)
            }

            HStack(spacing: Spacing.sm) {
                Text("@\(profile.handle)")
                    .font(.system(.subheadline, design: .monospaced, weight: .bold))
                    .foregroundColor(.primary)
                    .padding(.horizontal, Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .touchTarget()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))

                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    UIPasteboard.general.string = "@\(profile.handle)"
                    copiedCode = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        copiedCode = false
                    }
                } label: {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: copiedCode ? "checkmark" : "doc.on.doc")
                        Text(copiedCode ? "Copied" : "Copy")
                    }
                    .font(.system(.footnote, weight: .semibold))
                    .foregroundColor(.primary)
                    .padding(.horizontal, Spacing.md)
                    .touchTarget()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
                }

                ShareLink(item: URL(string: "https://airpal.me/@\(profile.handle)")!) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "square.and.arrow.up")
                        Text("Invite")
                    }
                    .font(.system(.footnote, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, Spacing.md)
                    .touchTarget()
                    .background(AirPalColors.brand)
                    .clipShape(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
                }
            }

            Text("Share your code — you both earn Stars when your mate completes their first experience.")
                .font(.system(.caption2))
                .foregroundColor(.secondary)
        }
        .padding(Spacing.md)
        .background(AirPalColors.goldMuted)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                .stroke(AirPalColors.gold.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Profile Footer
private struct ProfileFooterView: View {
    let handle: String

    var body: some View {
        VStack(spacing: Spacing.xs) {
            Divider()
                .padding(.vertical, Spacing.sm)

            HStack(spacing: 4) {
                Text("AirPal")
                    .font(.system(.footnote, weight: .bold))
                Text(".me")
                    .font(.system(.footnote, weight: .bold))
                    .foregroundColor(AirPalColors.brand)
            }

            Text("People, places, things & experiences — made easier.")
                .font(.system(.caption2))
                .foregroundColor(.secondary)

            Text("airpal.me/@\(handle)")
                .font(.system(.caption2, design: .monospaced))
                .foregroundColor(.secondary.opacity(0.8))
                .padding(.top, 2)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Spacing.md)
        .padding(.bottom, Spacing.xl)
    }
}

// MARK: - QR Code Sheet Modal
private struct QRCodeSheetView: View {
    let profile: BioProfile
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: Spacing.md) {
            Capsule()
                .fill(Color.secondary.opacity(0.3))
                .frame(width: 36, height: 5)
                .padding(.top, Spacing.sm)

            Text("Share @\(profile.handle)")
                .font(.system(.headline, weight: .bold))

            RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                .fill(Color.white)
                .frame(width: 200, height: 200)
                .overlay(
                    Image(systemName: "qrcode")
                        .resizable()
                        .scaledToFit()
                        .foregroundColor(.black)
                        .padding(Spacing.lg)
                )
                .shadow(color: Color.black.opacity(0.08), radius: 10, y: 4)

            Text("Scan to connect on AirPal")
                .font(.system(.footnote))
                .foregroundColor(.secondary)

            Button("Done") {
                dismiss()
            }
            .font(.system(.body, weight: .semibold))
            .touchTarget()
            .padding(.top, Spacing.sm)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Loading Skeleton State
private struct LoadingSkeletonView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                // Header skeleton
                HStack(spacing: Spacing.md) {
                    RoundedRectangle(cornerRadius: Radius.lg)
                        .fill(Color.gray.opacity(0.18))
                        .frame(width: 80, height: 80)
                        .shimmer()

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.gray.opacity(0.18))
                            .frame(width: 140, height: 20)
                            .shimmer()

                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.14))
                            .frame(width: 100, height: 14)
                            .shimmer()
                    }
                }

                // Deck skeleton
                HStack(spacing: Spacing.sm) {
                    Capsule().fill(Color.gray.opacity(0.18)).frame(height: 44).shimmer()
                    Capsule().fill(Color.gray.opacity(0.18)).frame(height: 44).shimmer()
                    Capsule().fill(Color.gray.opacity(0.18)).frame(width: 60, height: 44).shimmer()
                }

                // Cards skeleton
                RoundedRectangle(cornerRadius: Radius.card)
                    .fill(Color.gray.opacity(0.14))
                    .frame(height: 120)
                    .shimmer()

                RoundedRectangle(cornerRadius: Radius.card)
                    .fill(Color.gray.opacity(0.14))
                    .frame(height: 180)
                    .shimmer()
            }
            .padding(Spacing.md)
        }
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Empty State View
private struct EmptyStateView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 56))
                .foregroundColor(.secondary)

            Text("Profile Not Found")
                .font(.system(.title3, weight: .bold))

            Text(message)
                .font(.system(.subheadline))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            Button("Refresh", action: onRetry)
                .font(.system(.subheadline, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, Spacing.lg)
                .touchTarget()
                .background(AirPalColors.brand)
                .clipShape(Capsule())
                .padding(.top, Spacing.sm)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Error State View
private struct ErrorStateView: View {
    let errorMessage: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 56))
                .foregroundColor(.orange)

            Text("Unable to Load Profile")
                .font(.system(.title3, weight: .bold))

            Text(errorMessage)
                .font(.system(.subheadline))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            Button("Try Again", action: onRetry)
                .font(.system(.subheadline, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, Spacing.lg)
                .touchTarget()
                .background(AirPalColors.brand)
                .clipShape(Capsule())
                .padding(.top, Spacing.sm)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - App Root With Standard iOS Tab Navigation (Max 5 Tabs)
struct AirPalAppRootView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            BioProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle.fill")
                }
                .tag(0)

            NavigationStack {
                Text("Discover Spots & Stays")
                    .navigationTitle("Discover")
            }
            .tabItem {
                Label("Discover", systemImage: "compass.drawing")
            }
            .tag(1)

            NavigationStack {
                Text("Instant Hangout / Now")
                    .navigationTitle("What Now?")
            }
            .tabItem {
                Label("Now", systemImage: "bolt.fill")
            }
            .tag(2)

            NavigationStack {
                Text("Inbox & Invitations")
                    .navigationTitle("Inbox")
            }
            .tabItem {
                Label("Inbox", systemImage: "tray.full.fill")
            }
            .tag(3)

            NavigationStack {
                Text("Settings & Account")
                    .navigationTitle("Settings")
            }
            .tabItem {
                Label("Settings", systemImage: "gearshape.fill")
            }
            .tag(4)
        }
        .tint(AirPalColors.brand)
    }
}

// MARK: - Previews for All States & Modes
#Preview("Loaded State - Light Mode") {
    BioProfileView()
        .preferredColorScheme(.light)
}

#Preview("Loaded State - Dark Mode") {
    BioProfileView()
        .preferredColorScheme(.dark)
}

#Preview("Loading Skeleton State") {
    LoadingSkeletonView()
}

#Preview("Empty State") {
    EmptyStateView(message: "This bio hasn't been claimed yet.") {}
}

#Preview("Error State") {
    ErrorStateView(errorMessage: "The network connection was lost.") {}
}

#Preview("Full App TabView (Max 5 Tabs)") {
    AirPalAppRootView()
}
