import { Hanger } from '@/components/decor/Decor'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Layout'

export default function NotFoundPage() {
  return (
    <EmptyState
      className="mt-10"
      illustration={<Hanger className="h-12 w-16 text-lavender" />}
      title="This page is not in the closet"
      description="The link may be old or mistyped."
      actions={<ButtonLink to="/">Back home</ButtonLink>}
    />
  )
}
