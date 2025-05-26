import type { FC } from 'react'
import Wrapper from '#/ui/Wrapper'
import { useTranslation } from 'react-i18next'

const Home: FC = () => {

  const { t } = useTranslation()
  return (
    <Wrapper className="max-w-4xl mx-auto mt-4 px-4">
      <span></span>
    </Wrapper>
  )
}

export default Home
