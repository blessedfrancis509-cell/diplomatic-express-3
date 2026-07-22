import React from "react";
import { Star, Quote, User } from "lucide-react";
import { motion } from "motion/react";

const reviews = [
  {
    id: 1,
    name: "John Doe",
    role: "Business Owner",
    content: "Diplomatic Xpress Logistics has been a game changer for my international shipping. Their tracking system is incredibly accurate.",
    rating: 5,
    avatar: "https://picsum.photos/seed/user1/100/100"
  },
  {
    id: 2,
    name: "Sarah Smith",
    role: "E-commerce Manager",
    content: "Fast, reliable, and secure. I never have to worry about my high-value shipments getting lost or delayed.",
    rating: 5,
    avatar: "https://picsum.photos/seed/user2/100/100"
  },
  {
    id: 3,
    name: "Michael Brown",
    role: "Logistics Coordinator",
    content: "The admin interface is very intuitive. Generating receipts and tracking multiple packages at once is a breeze.",
    rating: 4,
    avatar: "https://picsum.photos/seed/user3/100/100"
  },
  {
    id: 4,
    name: "Emily Davis",
    role: "Individual Shipper",
    content: "I sent a fragile package across the country and it arrived in perfect condition. Great customer support too!",
    rating: 5,
    avatar: "https://picsum.photos/seed/user4/100/100"
  }
];

export const Reviews = () => {
  return (
    <div className="py-20 max-w-7xl mx-auto px-6 space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-black text-brand-primary tracking-tight uppercase">What Our Clients Say</h2>
        <p className="text-lg text-slate-500 leading-relaxed">
          Don't just take our word for it. Here are some reviews from our valued customers around the world.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {reviews.map((review, i) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card relative p-10 space-y-6 hover:shadow-2xl transition-all border-slate-100"
          >
            <div className="absolute top-8 right-10 text-brand-secondary opacity-10">
              <Quote size={80} />
            </div>
            
            <div className="flex text-yellow-400 gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill={i < review.rating ? "currentColor" : "none"} />
              ))}
            </div>

            <p className="text-lg text-slate-600 leading-relaxed italic relative z-10">
              "{review.content}"
            </p>

            <div className="flex items-center gap-4 pt-4">
              <img 
                src={review.avatar} 
                alt={review.name} 
                className="w-14 h-14 rounded-full border-2 border-brand-secondary/20"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="font-bold text-brand-primary text-lg">{review.name}</h4>
                <p className="text-sm text-slate-400 font-medium">{review.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-brand-primary rounded-[3rem] p-12 text-center text-white space-y-6">
        <h3 className="text-3xl font-black">Want to leave a review?</h3>
        <p className="text-slate-400 max-w-xl mx-auto">We value your feedback. Please contact our support team to share your experience with us.</p>
        <button className="btn-primary bg-brand-secondary hover:bg-brand-secondary/90 border-none">Contact Support</button>
      </div>
    </div>
  );
};
