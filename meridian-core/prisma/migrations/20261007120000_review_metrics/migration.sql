-- Short result chips rendered on each testimonial card.
ALTER TABLE "Review" ADD COLUMN "metrics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
