import { Link } from 'react-router-dom';
import {
  Shield,
  Camera,
  Scale,
  Calculator,
  ExternalLink,
  FileCheck,
  ArrowRight,
  CheckCircle2,
  Circle,
  Building2,
  Clock,
  Image,
} from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { Button } from '@/components/ui/button';

const pipelineStages = [
  { label: 'Scheduled', done: true },
  { label: 'Move-Out', done: true },
  { label: 'Inspection', done: true, active: true },
  { label: 'Repair', done: false },
  { label: 'Ready', done: false },
];

const features = [
  {
    icon: Shield,
    title: 'Turnover Pipeline',
    description:
      'Track every stage from move-out notice to unit-ready. Never miss a deadline again.',
    accent: 'bg-emerald-50 text-emerald-700',
    image: '/images/feature-keys.jpg',
  },
  {
    icon: Camera,
    title: 'Photo Documentation',
    description:
      'Before/after comparison with timestamped, geotagged evidence that holds up in court.',
    accent: 'bg-blue-50 text-blue-700',
    image: '/images/feature-inspection.jpg',
  },
  {
    icon: Scale,
    title: 'State Legal Rules',
    description:
      'Deposit return deadlines and itemization requirements for all 10 launch states, built in.',
    accent: 'bg-amber-50 text-amber-700',
    image: '/images/feature-legal.jpg',
  },
  {
    icon: Calculator,
    title: 'Deposit Accounting',
    description:
      'Itemized deductions with automatic compliance checks against your state\'s rules.',
    accent: 'bg-violet-50 text-violet-700',
    image: '/images/feature-documents.jpg',
  },
  {
    icon: ExternalLink,
    title: 'Tenant Portal',
    description:
      'Share inspection results via magic link. Tenants can review, acknowledge, or dispute.',
    accent: 'bg-rose-50 text-rose-700',
    image: '/images/feature-portal.jpg',
  },
  {
    icon: FileCheck,
    title: 'E-Sign Reports',
    description:
      'Digital signatures on inspection reports. Professional documentation, zero paper.',
    accent: 'bg-cyan-50 text-cyan-700',
    image: '/images/feature-esign.jpg',
  },
];

const steps = [
  {
    number: '01',
    title: 'Add Your Properties',
    description: 'Enter your rental units, set the state, and you\'re ready.',
  },
  {
    number: '02',
    title: 'Create a Turnover',
    description: 'Set the move-out date. The legal timeline builds itself.',
  },
  {
    number: '03',
    title: 'Follow the Pipeline',
    description: 'Inspect, document, calculate deductions, and close — all in one flow.',
  },
];

export function LandingPage() {
  const revealRef = useReveal();

  return (
    <div ref={revealRef} className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald" />
            <span className="font-heading text-lg font-700 tracking-tight text-foreground">
              TurnoverKit
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/signin">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="px-4 pb-16 pt-12 sm:pb-24 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="hero-stagger hero-stagger-1 mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald/20 bg-emerald/5 px-3 py-1 text-xs font-500 text-emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
              Built for independent landlords
            </div>

            <h1 className="hero-stagger hero-stagger-2 font-heading text-4xl font-800 leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              Every turnover.{' '}
              <span className="text-emerald">Tracked.</span>{' '}
              <span className="text-emerald">Protected.</span>
            </h1>

            <p className="hero-stagger hero-stagger-3 mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              The command center for rental property turnovers. Move-outs, inspections,
              deposit accounting, and state-specific legal compliance — all in one place.
            </p>

            <div className="hero-stagger hero-stagger-4 mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full gap-1.5">
                  Get Started Free
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Button>
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  See How It Works
                </Button>
              </a>
            </div>
          </div>

          {/* Pipeline Mock Visual */}
          <div className="hero-stagger hero-stagger-5 mx-auto mt-12 max-w-2xl sm:mt-16">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {/* Mock header bar */}
              <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald" />
                  <span className="font-heading text-sm font-600 text-foreground">
                    TurnoverKit
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                </div>
              </div>

              {/* Mock turnover card */}
              <div className="p-4 sm:p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-heading text-sm font-600 text-foreground">
                        123 Main St, Unit 4B
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Denver, CO
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-500 text-amber-700">
                    In Progress
                  </span>
                </div>

                {/* Pipeline visualization */}
                <div className="mb-5">
                  <div className="flex items-center justify-between">
                    {pipelineStages.map((stage, i) => (
                      <div key={stage.label} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center">
                          {stage.done ? (
                            <CheckCircle2
                              className={`h-5 w-5 sm:h-6 sm:w-6 ${
                                stage.active
                                  ? 'text-emerald animate-pulse'
                                  : 'text-emerald'
                              }`}
                            />
                          ) : (
                            <Circle className="h-5 w-5 text-border sm:h-6 sm:w-6" />
                          )}
                          <span
                            className={`mt-1.5 text-[10px] font-500 sm:text-xs ${
                              stage.done
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {stage.label}
                          </span>
                        </div>
                        {i < pipelineStages.length - 1 && (
                          <div
                            className={`mx-0.5 h-0.5 flex-1 rounded-full sm:mx-1 ${
                              stage.done && pipelineStages[i + 1]?.done
                                ? 'bg-emerald'
                                : stage.done
                                  ? 'bg-gradient-to-r from-emerald to-border'
                                  : 'bg-border'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/60 p-2.5 sm:p-3">
                    <p className="text-xs text-muted-foreground">Deposit</p>
                    <p className="font-heading text-base font-700 text-foreground sm:text-lg">
                      $2,400
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2.5 sm:p-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Deadline</p>
                    </div>
                    <p className="font-heading text-base font-700 text-foreground sm:text-lg">
                      21 days
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2.5 sm:p-3">
                    <div className="flex items-center gap-1">
                      <Image className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Photos</p>
                    </div>
                    <p className="font-heading text-base font-700 text-foreground sm:text-lg">
                      12
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Property Image Strip */}
        <section className="reveal relative h-48 overflow-hidden sm:h-64">
          <img
            src="/images/hero-apartment.jpg"
            alt="Modern apartment interior"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        </section>

        {/* Features Section — Bento Grid */}
        <section className="reveal border-t border-border bg-muted/30 px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center sm:mb-14">
              <h2 className="font-heading text-2xl font-700 tracking-tight text-foreground sm:text-3xl">
                Everything you need to close a turnover
              </h2>
              <p className="mt-2 text-muted-foreground">
                From move-out notice to deposit return — one workflow, zero guesswork.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="card-hover group overflow-hidden rounded-xl border border-border bg-card"
                >
                  {feature.image && (
                    <div className="h-36 overflow-hidden sm:h-40">
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-5 sm:p-6">
                    <div
                      className={`mb-3 inline-flex rounded-lg p-2.5 ${feature.accent}`}
                    >
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-heading text-base font-600 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="reveal px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 text-center sm:mb-14">
              <h2 className="font-heading text-2xl font-700 tracking-tight text-foreground sm:text-3xl">
                Up and running in minutes
              </h2>
              <p className="mt-2 text-muted-foreground">
                No setup wizards, no training sessions. Just add a property and go.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
              {steps.map((step, i) => (
                <div key={step.number} className="relative text-center sm:text-left">
                  {/* Connector line (desktop only) */}
                  {i < steps.length - 1 && (
                    <div className="absolute left-1/2 top-10 hidden h-0.5 w-full bg-border sm:block" />
                  )}

                  <div className="relative mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary font-heading text-sm font-700 text-primary-foreground">
                    {step.number}
                  </div>
                  <h3 className="font-heading text-base font-600 text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="reveal px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl rounded-2xl bg-primary px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="font-heading text-2xl font-700 tracking-tight text-primary-foreground sm:text-3xl">
              Ready to protect your deposits?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70 sm:text-base">
              Start tracking turnovers in minutes. State-specific legal compliance from day one.
            </p>
            <Link to="/signup" className="mt-6 inline-block">
              <Button
                size="lg"
                variant="secondary"
                className="gap-1.5 bg-emerald text-white hover:bg-emerald/90"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Button>
            </Link>
            <p className="mt-3 text-xs text-primary-foreground/50">
              No credit card required
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald" />
            <span className="font-heading font-600 text-foreground">
              TurnoverKit
            </span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Contact
            </a>
          </div>
          <p>&copy; {new Date().getFullYear()} TurnoverKit</p>
        </div>
      </footer>
    </div>
  );
}
