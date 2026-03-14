"use client"

import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Marie L.",
    role: "Designer Produit",
    company: "Utilisatrice HIREDGE",
    avatar: "ML",
    content: "Les dossiers de candidature générés par l'IA m'ont fait gagner un temps précieux. Mon escouade m'a gardée motivée pendant les moments difficiles.",
    rating: 5,
  },
  {
    name: "Thomas R.",
    role: "Développeur",
    company: "Utilisateur HIREDGE",
    avatar: "TR",
    content: "Les scores de compatibilité sont vraiment pertinents. EDGE m'a aidé à découvrir des entreprises que je n'aurais jamais trouvées seul. Les infos des éclaireurs sur les process d'entretien étaient un vrai plus.",
    rating: 5,
  },
  {
    name: "Camille D.",
    role: "Responsable Marketing",
    company: "Utilisatrice HIREDGE",
    avatar: "CD",
    content: "Ce que j'ai le plus aimé, c'est le système d'escouades. Avoir un groupe de personnes qui traversent le même parcours rend la recherche d'emploi bien moins solitaire.",
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
            Ce que nos utilisateurs en pensent
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Découvrez comment HIREDGE accompagne les candidats dans leur recherche d'emploi.
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
