import { SearchView } from '@/components/search/search-view'

interface SearchPageProps {
  searchParams: Promise<{ query?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams

  return <SearchView initialQuery={params.query} />
}