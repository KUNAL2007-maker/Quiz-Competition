import React, { useEffect, useRef, useState } from 'react';

// Kunal Bankhele's signature (base64 PNG) — the Organizing Committee signature.
const KUNAL_SIGNATURE_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALkAAABNCAYAAAD6rsVTAAAc0ElEQVR4nO2de5RdVX3HPzOTuZnLDJlkyEBIIIAEsVGsEpdISxciomIrUVRcirX4aNX6KEqpj1pFa62tb2sV8F0FrSIiIj6olihV0aJUChqNBSNgJBLIyyRDZqZ//PaX/Tv77nMfc++dOybzXeuuex77PO453/3bv9f+3b5lRz+CeXQMfcAIsB14IfB84NHAb4GDgLt7dmetYRA4ANga1vvD9xQw6ranqLdP55kCBsJnwm2vALtdG39MNbS9L9zbfcl5h8J+HTcczncPwII6NzSP1jGNEfxtwF+HbWMYyeu9/E5hAJjswHnGkvP0dei8ImGFSHAoEj6FftOkW/ckHwz7fMeYxD3vfubRaRxDJDjA7eF7bwevIUmYotLkscJgZv9SjOT+XJ7gu0rOW6mzL3e/OqcfJcqwO+zvT+5lkFrSD7n2AEPzJO8s1gI/desPCd+dHjFzBIfmSO7f+UBm+0pM7ci1H6Zc4laplc7+vrQ+lBw3QpG4nuyDyb4qRUKnvzfttINAZZ7k7aHPLa8FrnDrnwNuDsudkuJ9mW0DJctlKGuvjjiG6eMDBJK4Nge65UqynBKu7F4WYmqdcACR2ClJ03M2ukaqBlVhXl2ZKUbC97Rbv8Lt/wbwtC5cd5ooMSXhvKTbEr5TKeqXd4flcWBnWB4mdsTN2P1vS9pD5MtSikQdDMdBlNQTYXkIU2Mmwr1vDed8GPAMYEnJvY6G+5OaMkgwJN11JpL7m3DtJfV3zJN8ZtiRrG93yy8ETu3itZsxACdLlj28xOsjStMfY51kiNgJ3gycBtzpjvXnLVNh6mEv1im3hfV+it6WMtWHcG9VigT3XpcprMNMAlPz3pX20A9c59Y3Ahe79QV01uCE1r0cZWTcVafNGPDrsP7fwBrgpcBid6w6RT9FPbleB/PG5g7gF0S3ap87Tx+wJznWX6Oa7BvDRhZJeqlZW2HehdguPguc6NaPCN/SDTtNcOiMK2+EOBp5PbaKSU2pPf+KERyiMerby7shiTpEUbqm/mwdNxCuvytpr3vwPu9U25CULxs9FmG/b7c/YB4zw58DZ7p1bxSmLyBnMPYSqZ7uJaw65inAX7p2a0uOnQkWYKrQTrdN95B6VEjWpasrMDSKdZgdmH6/BrM37n8H8ySfGZ5IUS0RiUczbaFopPUaaeDFL09iEvAhmPEpbAauJE/A1PAD45Xnll/vx55HmU89N1J5t6LXzzXyKBo6Gj4T7vz98yRvHQ8BvuTWHxS+79cBZxlpoKWS7EtRJRLA+7YXE6X4Tckx54TvYyjqyr6DpOH4MniXIRQFQ+oCTM+5iKLRP0F85nI/3grcgXWWKvN+8hnBE+A0YH1YnomHodvI+cS9euINOAVlTk/O8XXgu2H5FmrD57lr1UM1OW7ELVco6vHpOeVRGSTq//63TIZ7lMdmFBjYn0je7EsAs9aF1W7Zqx1/DPxHW3fUGfi8Doj+aC37dlWiUVkJywcAR2HpB9PA1cn5f0qUlovc9mF3HenGEH3UU+6YqfBZio0ik+H645jUhaJEHwzHifD94XpbXJt0xJoENhF19ZGwvnN/8q604pXwD/OW8P0zt+1b1JJhLqHstw4QdVZhDzbEA3wyab8TuMadL3U75lySqcqRdrQJt7yjZF96nEh8Xwv7738G+7IkT32prXoC/DB6ObAqLL+S7gZ7OoF6JN9K0TBT2+cCZ7u2U1hg6/Nh3UtWn9oqDslT4lWOYYruRUU+dV3faabDPp2vLEux0f6ac+/LJE+t91Z05gpRyvwt8JSwfA3wLmr9v3MNOZL7NFypC8JK4CNJ+5OAS8JyBVNrBK+OeGHic0+UI+6PSX3ivq331UOtnzy9ntYHMu0LSV77MslTPAZ4N0V9uwx64CdjIW3hcUm7NKNurmKAWjXCj1QfStpfBHwnLA9ixNrs9qcGpzq9Fw5QK11zUAfSORZQ6zJMr9do3S9X9hedfAXmJQB7eV+iNv8kxSrgWreeC+iUSaZewrsIBRmnnnSyO1ZjXiJhHfB+d65BijOE+ig+u1RPF0GnKAZ7cs97CWZ8bnH7vSEtIZzq2qmULxulK77Rvo6j3LLCyfXwMIqG5uIO3083UWZ75CTpEPC1ZNuZwI8wKbiL6I7TuUcopsZ6D4iPWnpuDZJPpz0UeABRFRrEZlEJC5N7G6b47tLfOuzuYYD9LNV2qVteR2NPyw/dch8myU7q9E21gFbSAloh+anYKCecgknVYYodW23koxaqybKuMUpUGzTfMr0/eXqWEnlYoTy6qWvU2+8DTRXda98+OpH5CCzDTfgRcFxY9oTpI/q+FwP3AhuAo8O2o4H/69ZNZuD1y9x8zYWYy09Sqkzl8vq3iODPdSwWxPLP5XTgK2HZP79xoj6+iKJkByPoWLheuk+SVWrdEixTUPcvn7mitnoXqUtwiGL4fkW47i+Ta0k9Gg3H3ANM7KuS/BfJul7kReH7AeF72i3fC3yYSPBnkyd4I1fkQXX2HZCs91MMsDTKA9/j9uVUrmVuv8hdxVQMra/CCP4y4nMB+L5b9vnxvsKAz/0WprDOlhIcjHRluS3TFL09/UQjdgInicM5lJQ1Fq6n3PYRzDsk+3IUszNOxRwHI/uqJIeYTqoSEVB/2D+bGAx5LfCPYdnnhKfuKT8SdAIqBVEN3zIWJ8K1KuH7DneMhv1dFAMyaSRUkJT2930MNoJB3nDtBw4D7iJvbHvdXD503UdaKkLSVmkEuc46ThyptiT7qpgk/1Pg9ZljU6zbH7wrry7ZvhB7yHuB84C3h+1PAq5y7XxOeFp3JCV4I9IvxkaMMeB44ATgT4BH1Tkmhw1Y2YtPYCTZghFDedpQbnf8Avg7t34GkeBQlNJD4TzHYMb7zyhO1Jb0lXoxRbETpB3Ce0m8qiUX52T4HcomXIVNIzyj5LcI7wH+PZxzFBupNodzTuyrkly6K0TSfRp4JrVEfBA25Qss0PPKFq+lyb3bM/sWY/nNT8Be1ANLzrEbI98EMZq6h6IKMBTO9zOij/t9mNpRD2q7gzgq6fdfjEU1vfT2erfiAA/FVKENxDQHqF/nZQWxfstmol4vt2Q1nPNE7NmcTK0657EXI+9jsZwUnctnVKrD3uCOG9tXSS4iDxAlsVdV9LIPIxovP6aYjNUIB2PDt8dhmJ57DnBWyXGvwEaCTZjacTu1Q/IgptsPYJ1nB0U16WSsOtetwAeILz1FlWJSFtgQ/8awrGdyAnB9aDuNdTo/Yq0ijhjan8MARly19RjHSP9eaoNqHt/Gfu8tWIT5e8Bvkt+UU3EqWMfalO7fV9UVSapLSvbvxV6wCP6fWES0EbxO7gn+MuzlpbgQeCtFQ/hQ4FeZthXibPaFxGlcI+Famr84grlB17n76ceMr00UdeBpimT7AyLB/z58jwI3unvYSkxlFcm3UjsbP8VwuAeNioPAI7G0iDR9V/gE8DFM+mpy9OaStqPY81GHlorjt9/q2qtMxsS+QnI94HHgD7EfdwhW8kD4JCYd7sKkw7fcvmYIDkaeceDB2MTep2baLMdI8dvMPsgTHIrzFpWstBOT5F4yybsAJjXvDPd1W9jm1Q2vSpwCfNCtv56oB+/B/NVePfIjn9fT0xIVGi2OwkbCy4kTSVJ8CDPqf0sxGqqJx/536poi8x7suSpFd0dY34U9h5Hk+Puf5+8qyR+MzbF8BtFt1ghnl2wvUyuEBdhLfCnwlsz+j2C67fVN3kcz2En0CUN0pS3CKgKIAHKjLQ/tf4M9j23hGD/r3k9ne607n1SBFW75PqIUH3LnkJ97EHv2L8ZGhxx+BFyGSevbwj0vIOa7e3XoIGKnFnx6QDqRYhPRTarRrzSK3Uud3LuTmsEzMbXgxMy+T2PD961Yj7+WqLJ8HgtVH4kR5B6Kvmmwh5j6v4/ALPu3J9vfhL30DdgsoTLJ3C7GqNVrwUasjW49V+X1eOAHYflw4CdEo+5uzJ6YwjqHOsoh2O9SsR9fyOcYTIV6Cvb7U9yOPeebwr3dRCSeyLoEGx1yv0mduJnszkFiAVIf6CqNYvdSkovguZcknIW5hjwuw/S+LxMz5VI83C2fF75vw9yDIriG4xswUkxjrrxNxKFf+Ahm6EHnKseWQRFGkaEf89CMYh3vOqLhfCA2TItQCvwogHM28M8UvRZPJhLPqx6S1opInog9l/dl7nESeDox1xyKZS5SKBwvfV/vW4VFpWenmZI5SCBJ1WqYQj0X1BVP8MdjOSKvS9psx4yX/2rynNe6ZRkjVxMNIA33fZilr2H6u+64r2IlGXzUM62qKnQqKFQhGl4rMZ/6NiwaOYK90PVYlLaK1Vrcjhmz1xMLjJbhU1gnUbqxn3j9eOAvKJbZ8HgdZkQfS3QjjhADUSL4/YlRybaUjBWs81YwYZWT8PXQtLCZCyQH+CbwR8m2q4BzgZ+7bc3+MElrDa0i4B6id+AfiLppigsxfdPDl1JL0amop2bPr6QYKq9g6tZPMV+5Ot4ZwBcy57kD6yxnY0JD6QzPCt8i1EkUDXCPa4Hzgf/BVJnfYCqHOuEwJpUVfe0nqkmpRJ8munI1c2jQfSR0Bml+cktdFcWjFyT31v8HgRe4fVdhwYk704MCpIfV+3HeyHgD0WUGZrBegwUUhDuB52BqyyimqrwIe1Hnu3azUTtFASXp3AcT1QihDzMu30EkLZhheSomXeWrvgP4aNi/HnPpTWPepRRrMcku1+SxGKGrxByU3RjhIRYHkmdkgOiKXERUJRS+95MidPxNRK+KoqeNoDZpPcZSzLbhuRh7ceuT7WcAX5zhOdN8EpHxXOwh/EvJcZ/BwsHfTrY/FJNeAB8n1hyZTfw+1tFelNm3gTjfFKxDqDxd+ncmH6X8/v8XGz33Et1t3kuTloMbCddVItcSjHA+UJPD0nBPPu98IFmXeuMN1TKkVX0bYrayEBcDl2JGjQi+HdPJ+pg5wSE+lKVY5qCwhjzBX4J5HJ5BLcHBXF/PC8t/Fu67Wxgj+veFEzCJKIL/GntGHw/rIvhGrEOK4MrnPhnr6NMUCS7y92HpBcdhOr/PUNxEJO0QppLo3Asw4h+FSepdrq3PplzijoOiWrGc+J9BKkExFe4hzSUvQ8ul6WZDkq+nmLNxJjZMbcg3bxnyRvgQfoqbMcneSp0Ur+9egxmoPqScSk3vXVhNNM7uDW0PI+qvyylmEr4RuACboucDU8/DpPEQ5sdegaljVxPnXW7F7Id/KvkdP8B0803hXoRRastCLCL+04SM/GXh2Adikv/TYfuk++TI6dWPsjY5qLOmlbSkErXidga6S/IrMZedcBZWBbbRP4Q1i9TPfi0mxTy+jen8P2Zm8MP9LvIJRCIB2G97GKbXQlGPl8vyAsxWqIf1xKhhbqICmKr18sx2n0X5AKKRKrfjSqxzqLOehtkefp7n5dRGc8cwAt5LMQ+8HoHTmfbNQCTf647z2Y4tz6udibpyYLK+IFm+FHu5Ivh7sRf82bDeLsGXh28R/BXheinBT8JC/DMlOFgtEs2WqRKNOA+fHCXDDYoEvwQzdqeJBN9OPh/6tRTD4gNYgdELMT1aqogI/hNs1OkLHxF8CfHd9GOkORLLw/6yO8/XMIJfhHXQ4zAfuODVA9UYhOa8G1PUErzS4FN2zqa9KSnakeQHUkwvvQ4jlfAqLBDRLZxCMVQttGPEluHLWLosGBmkLy8l6qWKGEKR4HuonZD7ISwtwbd9D6ZSCc/FJOzvZe7n61iQ7FKssy/C1A55VXy08skUgzbCeiw5al1YTv3Ui7CR6ZfJdj/HsxU1RGhGp57Enkur585ipiRfTNTvHo1l8Qmvwh7+7XQPOb86Ydt1me2twLsofWhdEg/gNVhgRKml0q+PxSRrGerlf6/A9PF/y+z7MKb+bcTyyb2aJr+/H8bfEu7R4wvA32AdbjO16blLMftmK7Uu3LGwbxNFwZYjoTpBKnXTIkCNoM7fNtFnQnI/IeEOovoA9sC1L40CduKvRcqkt9BoVntZLnI9iPRVLGK4Nmz/ALFIfRUj6FU1R0esxYgqLMIM1IdjEvuopP2rMQl8D8WIIph3aDUWKZzAVLV3YHEAj69jxP4BprIcR3SPjhN91F6K+3+LGCQmqDUbkVSn8+qF9GlorFOrnedOW0SfSTBoDxawudBteznRXad86TR40i7BX0q5zxvKsww9miW49xHrRe3Chv4J7OW/GCPZJzDynE8ebyBGXp+A+cDPIZ+O+jmiKpTzPx+Mkf7RmAv0K5k2L8BckBswqayZQQdhBFdHT/O2D8FGJXUCZRwqV2QA61g3Za6ZoswgbSbYk7ZtO09oJpLck/dTFKNu3YLyiQnf78HUIt3LlZikTDP0uoVriYauEpXOwdSKc7BkriuxeZhgtknaCSawyOPFWEeB+jkwqWAR1mGj22WYWvE9inUFRzBCe7emR1oOQkEaeXU0caNs9lEK/RtFSnB5SBpJZUW1+916W5K8GZJruD4OC5QIR1Jb+mE28WrijPpWiu90Cu8gzgc9EyO6dyc+ktocc82pFA4kRhuPoThJGGrtHeGhmESVzbACCxJ9h8ZeCC9Nc+3qZYUKkvIQq1qlqbup505EVaLZasyGUWruLooTmvfQIcOzGRfiJGYMieAXYHpXLwkOkeDP6eA5KxhZ0rLPwhKiC/U8op56OSYJn0V0zYngNxLde57gB2OdYk9ovxmr+fJmdw5P8Jux9NenhzafJUrsM4gqVrvDeyOC+1JsUFQBG9WXhBjoUbmJrcT77koKc5kk91WT/PB5HvDObtxIi/gcJj0n6W6SWVky2BpMUr8/s+9STLJejKkQImLZJIhhzEWZ8xbtxHzk38TiAemzX4WlEq/GfOjNoFldN1U7NM1tKeZwSP/LU4lcuG0eaqvOOE4c+bx9kIt4toUyguQI3guVoAzKeT6ibqv24b0Dx2EekMsz7XzS1DqK/wwn5EaHhdQS/IuYPn8Z0U37RIoEvwjzqctTIYI3M9uqWWmZuvw0aXgcUzGky/uyzc2E3HVeeXXS4GDHJXo9KSiC30ospTYXoPv6KsX8j1ahZP8yiSG34PnURlN/RfRiSAf9JObhuQiLbp6FGW/jWE78HRQzJuWqezY2zW4DRRfjEBYI2oblqvRhBFlC9LwsxwixhRnmdZTAG32CLyLkt7X6hwQ+VXYHRSO5K2pLTl05jVjOdwdRB21malK38TRiekAnRxYVuVkN/BXFrEDhbZj35G7y7r0HYrqxPCoqZgTFaGgj+DiEIA9HBZOi3vDz8D7uVuHzTNKcE2UNjmJCRhOJwUiuBKp0Jr+HzqXcJbkldxHLceygC3p5SnJPoncS50fOBSwjThpeRXHG0ExxBpY/siaz7/NY2Psb5A2qldjLSofbxxAL/m+hvADoEPZiF2IvemtoezeNp9N5teRIauektgrvQpS09p4N1SXXfMxhYjUBv5zWK/fw3pUdxPC+Zu+3EnBqCV5dGSUS/HQs0NDtSbut4Gnh++20R/B3Y9I6xbmY/71ZlPnjv4FFHm/GjM1p8qPOYqK7cXH41gTkHMF98SGNqMPuPpoZLdIJJjmk9U8Ebwx6XlQpqhyN1BcFBZWfovN1DV6S64KPxaaC3dvNCzcJL9Gm3bZmcDwm8Vdh8zlTfB9z6f2w5Hrt4gSKE6MPoVh1S6UVvAooH3E68VcZevVcdBoZTsPsqFuo9XaolEM7yLmdpxrsF3T9Iawz6LeWdayOQJL8hvB9J3GonQ0sxH5kWbWplODvqnOuwzE/9VtL9t+FSepLMCMwl2bQyXmc12MvdTPmdvt1uLfXUDuF69iwrsoCOSI2S4ItmLHaqkEoNMoBl84u6dvqdaTS6DeqGlbXsACLtB0f1lfUadspHEAkdWpgHYT9+HvdNuVfT1FbcfZV5El9N+avvhGb1ZOmi84mxjF34FOxKO2jsPwUTQNcQe2c1xTN+Lanwv6NGNHTkWC6wfEpyiSyN0b9+eQrb9QZq8RJIGl5uK44N/qWHf0IJRz1Mzsz0j2UZ52SXXgc5ioEy9t4A+V650qMzIeTJ/UiTEe+G3uo7SaMtYqHE6tageWLfywsH4W93DKXqGqZDFA+6aSfWLjfE22AGNhpJw8k9b5ItfKl7FToqAx9FImtYF5XvXZ9y45+xDRwBfEPWXsJqS9fwPIZXlHSbhrL6/hmnXMNY8RoNJu8G6in26e58GcTJ0sr2KKKWD4TshkpnJOEyu+WpG8Xfiqar6CrmuP1VA89lzXhXm6kQ/kp9aDe2VWdqA4ejKkbytXYjRlLj6VI8Hdhaa7LsQfVT57gS93yTnpDcLDfcmiyTfbP6di/S8grcklo/2KM3BswPV6BkrJ8lJxHIh2dpFK0G2Dpdx+5Ej3BxaNm7AZVpR1nlur+SJKDRdfqzWqZ8TUwVWIZJqm+Wqft1dgwfhdREr6IWAHqdwHNuOnACLgGSxPwttCZmAG6keL/AEGxIkAzenq7LmAvtXW9caJxqzae9I28K4swQ3sb+dTfjkMuRBHq+9hMko3hU09v7SPWwlNEbgDzZ6/GXFmDpUdbvsW55L05h2Kenm3E+hydQLMEbBf1fNZLsN+VuglfT7HaF5jR/GHy/yA9SH0VZKaTDkTSgcwHYlKVIq5ex25Ecoj/oNFsfnrbEMkPwqZuParD59+GBUf0uYXYobyXJYXaHEnvU3pnGwOYK/QkTNLfgCV86e9XykL33g9eoVjSoVWJPkQsai9f+yHYiLOF+K/WupaM3SlqJzqrc6ijdCq/pmmkYf0DsVC3iqQvC59xYt2NG4jJNVvdR4bSVygnbw5HUCSy5o1ewdwwhnsBkTKXnlvmZtMxI9j7kqdjc2gv1aOZ3BZJZ/9HAEo2S43idO5mPZL7drOGufTHWAcTdfF7iOWF52GoEv/rKCW5V8OqmM57CEbwn2PEHMKEWNl/8jSCvCcyhlOj03tZ6mGmQaoZY66UbgZ7EZeF5XN7eB+9RloSQ77xXW5/PShPezA5bjfNpUSUzdG8j/oErWfv6PfMhj1Ug7lE8hVYVPAK8rVH9hf4CGAuKy/VraWLe9yORY0ldYVmXXyppE7zxn1YX/B54l5F6SnBYfaq2pbB1xZUZuELcg33I4iUo9RWm1pZckwaeJrCjP7dRN92IzVCSEP1Mhj73TZf1s3Dr/tO0DOCQ+8luR6EIn4vIaab7q+YdN8ijSYXpG43X07C6+QQpfYUpssvoDl9WIahl9YTbpu/dpoq4Je7mj7bCnotybdj3hXNoMlNDN7foLiAqmaliVY5eHVlyH2E3RQ9Hc1CuSn1iKt9PrNQmBNE77UkhzhRYS5NlO4m6hlo/cQEp1zZhzQglAvXVygGooaIvuxGedu+/mBOJ58iFsvXeVKXoWbbz7qrsAxzgeRrqV9DcF9Dvc7ciY6ekth7RZRyWy+BbCG1BfZ9p8xNXpkuWZ4T6DXJlSv+pJ7exeyhn/qRx05kCSqnROm5e4lSVX9AlZuSJ3JKrZHOrVqImsh8m2uf6yxdKxI0U/RaJ78A+yPY/QEVauuUdwv9WKT6cCzIlsN08hHpJ7D8/n5MFRnC/PVHEmulqyJYSvA+8oX3e4pekvwz4fv5PbyH2UKrBlhfyXezqGCJYMvC94jbJ4LWO/8U0ce+N3z2ECW0OkbunHNKikPv1JUxrKbfc3t0/dlGqy8+nds6Ez3Xh9/VydLZX2WTxKVWSSIr/2UzeTVnzunhHr0i+enYQ/tYj67fC+R01UaThmeKCczDso2YTDdAsV5LmU49RD6FV4l4qjLwO4NekXw5carbJMXw7zzag8LyaeEjTTRO3ZAieo7wKheh3Hf/jnRMn1ufk/h/0I3LCI0UrKUAAAAASUVORK5CYII=';

// Exact colours / paper from the approved cert.html design.
const PAPER =
  'radial-gradient(circle at 62% 38%, #faf8f2 0%, #f7f5ee 52%, #edeae0 100%)';
const TITLE = '#0b1f44';
const BODY = '#222d3f';
const ORANGE = '#e85a14';
const SANS = `'Inter', 'Manrope', sans-serif`;
const SERIF = `'Playfair Display', Georgia, serif`;

// Left "Event Convener" signature — the exact calligraphic squiggle from cert.html.
const LEFT_SIGNATURE_PATH =
  "M26,38 C12,40 12,15 27,12 C37,10 35,28 24,36 C19,40 31,42 40,26 C47,14 51,6 47,22 C42,39 36,53 38,53 C40,53 49,29 54,25 C57,23 54,36 58,36 C62,36 66,26 70,26 C73,26 70,35 77,35 C84,35 98,16 101,7 C104,-1 94,29 89,44 C86,52 91,32 100,29 C106,27 106,33 113,32 C122,31 136,28 148,27";

/**
 * Participant certificate — a faithful port of the approved cert.html design.
 *
 * The background artwork (top-left circuit traces, left asymmetric ribbon
 * architecture, NULL ORIGIN hexagon logo and the bottom-centre laurel seal)
 * is the EXACT SVG from cert.html, served as a static file
 * (/certificate-artwork.svg) and rendered as an image layer. The text
 * (brand, heading, name, citation, signature blocks) is HTML positioned
 * exactly as in cert.html, with only the recipient name being dynamic.
 * No cert ID, no QR code and no date appear on the certificate itself.
 */
export function CertificateTemplate({ name }: { name: string }) {
  const displayName = (name || '').trim() || 'Participant';
  const [fontSize, setFontSize] = useState(72);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let size = 72;
    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      if (!canvasRef.current) canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        while (size > 32) {
          ctx.font = `700 ${size}px "Playfair Display", Georgia, serif`;
          if (ctx.measureText(displayName).width <= 740) break;
          size -= 2;
        }
      }
    } catch {
      size = 72;
    }
    setFontSize(size);
  }, [displayName]);

  const nameFontSize = fontSize;

  return (
    <div
      style={{
        position: 'relative',
        width: 1200,
        height: 900,
        overflow: 'hidden',
        background: PAPER,
        fontFamily: SANS,
      }}
    >
      {/* Thin gold border frame, as in the approved design. */}
      <div
        style={{
          position: 'absolute',
          inset: 10,
          border: '1px solid rgba(179,141,58,0.55)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 15,
          border: '1px solid rgba(179,141,58,0.28)',
          pointerEvents: 'none',
        }}
      />

      {/* Exact artwork from cert.html (circuit traces, ribbons, hexagon logo, seal). */}
      <img
        src="/certificate-artwork.svg"
        alt=""
        aria-hidden="true"
        width={1200}
        height={900}
        style={{
          position: 'absolute',
          inset: 0,
          width: 1200,
          height: 900,
          pointerEvents: 'none',
        }}
      />

      {/* ===== Foreground HTML text & signature elements (positions from cert.html) ===== */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: 1200,
          height: 900,
        }}
      >
        {/* Brand name: NULL ORIGIN — vertically centred on the hexagon logo
            (logo centre y=140; Inter renders the caps low in the line box,
            so top is 96, not cert.html's 118, to centre the capitals on it). */}
        <div
          style={{
            position: 'absolute',
            left: 236,
            top: 96,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 48,
            letterSpacing: '0.02em',
            color: TITLE,
            lineHeight: 1,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          NULL ORIGIN
        </div>

        {/* Main certificate heading */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 222,
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              display: 'inline-block',
              margin: 0,
              padding: '2px 12px',
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 38,
              letterSpacing: '0.022em',
              color: TITLE,
              textTransform: 'uppercase',
            }}
          >
            CERTIFICATE OF PARTICIPATION
          </h1>
        </div>

        {/* "Proudly presented to" */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 300,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              display: 'inline-block',
              margin: 0,
              padding: '2px 10px',
              fontFamily: SANS,
              fontWeight: 400,
              fontSize: 22,
              color: BODY,
            }}
          >
            Proudly presented to
          </p>
        </div>

        {/* Recipient name */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 342,
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              display: 'inline-block',
              margin: 0,
              padding: '2px 18px',
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: nameFontSize,
              color: TITLE,
              letterSpacing: '0.005em',
              lineHeight: 1.08,
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </h2>
        </div>

        {/* Citation paragraph */}
        <div
          style={{
            position: 'absolute',
            left: 230,
            right: 230,
            top: 460,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              width: 740,
              margin: '0 auto',
              fontFamily: SANS,
              fontWeight: 400,
              fontSize: 19,
              lineHeight: 1.5,
              color: BODY,
            }}
          >
            has actively participated in{' '}
            <b>Cyber Security Quiz 2026</b>, a national-level cybersecurity
            championship organized by <b>Team Null Origin</b>, and is awarded
            the <b style={{ color: ORANGE }}>Certificate of Participation</b>{' '}
            for their active engagement and commitment throughout the
            competition.
          </p>
        </div>

        {/* Left signature block: Event Convener */}
        <div
          style={{
            position: 'absolute',
            left: 240,
            top: 654,
            width: 230,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 4,
            }}
          >
            <svg
              width="160"
              height="58"
              viewBox="0 0 156 58"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d={LEFT_SIGNATURE_PATH}
                stroke="#182334"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              width: 230,
              height: 1.5,
              background: '#2c384a',
              margin: '0 auto 12px auto',
            }}
          />
          <p
            style={{
              margin: 0,
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 19,
              color: BODY,
            }}
          >
            Event Convener
          </p>
          <p
            style={{
              margin: '8px 0 0 0',
              fontFamily: SANS,
              fontWeight: 400,
              fontSize: 18.5,
              color: BODY,
            }}
          >
            NULL ORIGIN
          </p>
        </div>

        {/* Right signature block: Organizing Committee (Kunal's signature) */}
        <div
          style={{
            position: 'absolute',
            left: 730,
            top: 654,
            width: 230,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 4,
            }}
          >
            <img
              src={KUNAL_SIGNATURE_DATA_URI}
              alt="Kunal Bankhele signature"
              style={{ height: 58, width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div
            style={{
              width: 230,
              height: 1.5,
              background: '#2c384a',
              margin: '0 auto 12px auto',
            }}
          />
          <p
            style={{
              margin: 0,
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 19,
              color: BODY,
            }}
          >
            Organizing Committee
          </p>
          <p
            style={{
              margin: '8px 0 0 0',
              fontFamily: SANS,
              fontWeight: 400,
              fontSize: 18.5,
              color: BODY,
            }}
          >
            NULL ORIGIN
          </p>
        </div>
      </div>
    </div>
  );
}

export default CertificateTemplate;
