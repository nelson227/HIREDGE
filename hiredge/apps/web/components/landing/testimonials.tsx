"use client"

import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Product Designer",
    company: "Now at Stripe",
    avatar: "SC",
    content: "HIREDGE completely transformed my job search. The AI-generated application dossiers saved me hours of research, and my squad kept me motivated during tough times. I landed my dream job in 6 weeks!",
    rating: 5,
  },
  {
    name: "Marcus Rodriguez",
    role: "Software Engineer",
    company: "Now at Vercel",
    avatar: "MR",
    content: "The compatibility scores were incredibly accurate. EDGE helped me discover companies I never would have found on my own. The scout insights about interview processes were game-changing.",
    rating: 5,
  },
  {
    name: "Emma Thompson",
    role: "Marketing Manager",
    company: "Now at Notion",
    avatar: "ET",
    content: "What I loved most was the squad system. Having 6 other people going through the same journey made the process so much less lonely. We still stay in touch even after we all got hired!",
    rating: 5,
  },
]

export function LandingTestimonials() {
  return (
    <section id="testimonials" className="py-20 lg:py-32">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Loved by thousands of job seekers
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Join the community of candidates who found their dream jobs with HIREDGE.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              {/* Quote Icon */}
              <Quote className="w-8 h-8 text-primary/20 mb-4" />

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground leading-relaxed mb-6">{testimonial.content}</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{testimonial.avatar}</span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role} · {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
